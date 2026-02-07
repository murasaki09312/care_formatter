class FormatTextService
  class ValidationError < StandardError; end

  CATEGORY_ORDER_KEYS = %w[
    vitals meal hydration toilet activity sleep medication skin notes
  ].freeze

  CATEGORY_LABELS = {
    vitals: 'バイタル',
    meal: '食事',
    hydration: '水分',
    toilet: '排泄',
    activity: '活動/リハ',
    sleep: '睡眠',
    medication: '服薬',
    skin: '皮膚/創',
    notes: '特記事項'
  }.freeze

  VALID_MODES = %w[handover summary family].freeze
  VALID_TONES = %w[objective warm].freeze

  def self.call(text:, mode:, tone:)
    new(text: text, mode: mode, tone: tone).call
  end

  def initialize(text:, mode:, tone:)
    @text = text.to_s
    @mode = mode.to_s
    @tone = tone.to_s
  end

  def call
    validate!

    llm_payload = llm_client.format(
      text: text,
      mode: mode,
      tone: tone,
      system_prompt: llm_system_prompt
    )

    if llm_payload
      build_response(result: normalize_llm_result(llm_payload), used_llm: true)
    else
      build_response(result: dummy_result, used_llm: false)
    end
  end

  private

  attr_reader :text, :mode, :tone

  def llm_client
    @llm_client ||= LlmClient.new
  end

  def validate!
    raise ValidationError, 'text is required' if text.strip.empty?
    raise ValidationError, 'mode is invalid' unless VALID_MODES.include?(mode)
    raise ValidationError, 'tone is invalid' unless VALID_TONES.include?(tone)
  end

  def build_response(result:, used_llm:)
    {
      result: result,
      mode: mode,
      tone: tone,
      category_order: CATEGORY_ORDER_KEYS,
      used_llm: used_llm
    }
  end

  def dummy_result
    case mode
    when 'handover'
      dummy_handover
    when 'summary'
      dummy_summary
    when 'family'
      dummy_family
    else
      '時刻不明 【特記事項】記録を確認してください。'
    end
  end

  def llm_system_prompt
    <<~PROMPT
      あなたは介護記録の整形アシスタントです。出力は日本語の本文のみで、前置きや補足は不要です。
      modeごとの出力制約を厳守してください。

      共通:
      - 事実ベースで簡潔に書く
      - tone=objective は客観的で簡潔
      - tone=warm は丁寧で安心感のある言い回し

      mode=handover:
      - 各行は「HH:MM 【カテゴリ】内容」または「時刻不明 【カテゴリ】内容」
      - カテゴリは次のいずれか: バイタル, 食事, 水分, 排泄, 活動/リハ, 睡眠, 服薬, 皮膚/創, 特記事項
      - 時刻は 9:10 / 9時10分 を 09:10 に統一
      - 1行60文字以内

      mode=summary:
      - 3〜6文
      - 構成は「状況→対応→結果」

      mode=family:
      - 300〜600文字
      - 専門用語は噛み砕き、必要なら短い補足を括弧で加える
      - 不安を煽らず、事実は省略しない
    PROMPT
  end

  def normalize_llm_result(raw_result)
    case mode
    when 'handover'
      normalize_handover_result(raw_result)
    else
      raw_result.to_s.strip
    end
  end

  def normalize_handover_result(raw_result)
    parsed_lines = raw_result.to_s.lines.map(&:strip).reject(&:empty?).map do |line|
      parsed = parse_handover_line(line)
      {
        time: parsed[:time],
        category: parsed[:category],
        content: parsed[:content]
      }
    end

    return dummy_handover if parsed_lines.empty?

    parsed_lines
      .sort_by { |line| category_sort_index(line[:category]) }
      .map { |line| build_handover_line(time: line[:time], category: line[:category], content: line[:content]) }
      .join("\n")
  end

  def parse_handover_line(line)
    match = line.match(/\A(?<time>[^ ]+)\s+【(?<category>[^】]+)】(?<content>.+)\z/)
    return fallback_line(line) unless match

    category = normalized_category(match[:category].strip)
    content = match[:content].to_s.strip

    return fallback_line(line) if content.empty?

    { time: normalize_time_or_unknown(match[:time]), category: category, content: content }
  end

  def fallback_line(line)
    { time: '時刻不明', category: CATEGORY_LABELS[:notes], content: line }
  end

  def normalized_category(raw_category)
    CATEGORY_LABELS.value?(raw_category) ? raw_category : CATEGORY_LABELS[:notes]
  end

  def category_sort_index(category)
    key = CATEGORY_LABELS.key(category) || :notes
    CATEGORY_ORDER_KEYS.index(key.to_s) || CATEGORY_ORDER_KEYS.length
  end

  def dummy_handover
    lines = [
      ['09:10', CATEGORY_LABELS[:vitals], '体温36.5℃、血圧128/74、脈拍72で安定。'],
      ['12:00', CATEGORY_LABELS[:meal], '昼食は主菜8割、副菜10割を摂取。'],
      ['13:20', CATEGORY_LABELS[:hydration], '水分200mlを無理なく摂取。'],
      ['14:05', CATEGORY_LABELS[:toilet], 'トイレ誘導で排尿あり、痛み訴えなし。'],
      ['15:00', CATEGORY_LABELS[:activity], '歩行練習10分、ふらつき軽度。'],
      ['16:10', CATEGORY_LABELS[:sleep], '午後に20分の傾眠あり、その後覚醒。'],
      ['18:00', CATEGORY_LABELS[:medication], '夕薬を自己内服で完了。'],
      ['18:20', CATEGORY_LABELS[:skin], '仙骨部の発赤は悪化なく保清実施。'],
      ['時刻不明', CATEGORY_LABELS[:notes], 'ご家族へ本日の状態を口頭共有済み。']
    ]

    lines.map do |time, category, content|
      build_handover_line(time: time, category: category, content: content)
    end.join("\n")
  end

  def dummy_summary
    if tone == 'warm'
      '本日は全身状態が安定し、食事と水分を無理なく摂取できました。排泄は誘導でスムーズに行え、活動では歩行練習にも前向きに参加されています。午後に短時間の眠気はありましたが、その後は落ち着いて過ごされました。服薬と皮膚ケアも予定どおり実施できています。'
    else
      '本日はバイタルサインに大きな変動はなく、全身状態は安定していました。食事摂取量は概ね良好で、水分補給も実施できています。排泄は誘導で対応し、活動では歩行練習を行いました。短時間の傾眠後は覚醒が得られ、服薬と皮膚ケアは予定どおり完了しています。'
    end
  end

  def dummy_family
    if tone == 'warm'
      '本日は体温や血圧などの体調の指標（バイタル）が安定しており、安心して過ごしていただける一日でした。お食事は無理のない範囲でしっかり召し上がり、水分もこまめに補給できています。排泄はスタッフの声かけで安全に行え、歩行の練習にも前向きに取り組まれました。午後に少し眠そうな時間はありましたが、休憩後は普段どおりの様子に戻られています。お薬は予定どおり内服でき、皮膚の赤みがある部分は清潔を保ちながら継続して観察しています。引き続き、安心して過ごせるよう丁寧に支援いたします。'
    else
      '本日は体温・血圧・脈拍などのバイタルに顕著な異常はなく、全体として安定した状態でした。食事摂取は概ね良好で、水分補給も実施できています。排泄は誘導により安全に対応し、活動面では歩行練習を行いました。午後に短時間の傾眠がみられましたが、休憩後は覚醒し会話や反応に問題はありませんでした。服薬は予定どおり完了し、皮膚の発赤部位は清潔保持と観察を継続しています。今後も状態変化の早期把握に努め、必要時は速やかに対応します。'
    end
  end

  def normalize_time_or_unknown(raw)
    return '時刻不明' if raw == '時刻不明'

    normalized = raw.to_s
                    .gsub(/(\d{1,2})時(\d{1,2})分?/, '\\1:\\2')
                    .gsub(/(\d{1,2}):(\d{1,2})/) do
                      format('%<hour>02d:%<min>02d', hour: Regexp.last_match(1).to_i, min: Regexp.last_match(2).to_i)
                    end

    normalized.match?(/^\d{2}:\d{2}$/) ? normalized : '時刻不明'
  end

  def build_handover_line(time:, category:, content:)
    normalized_time = normalize_time_or_unknown(time)
    prefix = "#{normalized_time} 【#{category}】"
    max_content_length = [60 - prefix.length, 0].max
    compact_content = truncate_to(content, max_content_length)

    "#{prefix}#{compact_content}"
  end

  def truncate_to(content, max_len)
    return '' if max_len <= 0
    return content if content.length <= max_len
    return content[0, max_len] if max_len <= 3

    "#{content[0, max_len - 3]}..."
  end
end
