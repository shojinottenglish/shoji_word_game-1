// === ゲームの状態を管理する変数 ===
let score = 0; // 現在のスコア
let currentQuestionIndex = 0; // 現在の問題のインデックス
const totalQuestionsPerDay = 10; // 1日あたりの問題数 (クイズ、ミニゲーム共通)
const totalGameDays = 7; // ゲームの総日数（学園祭までの日数など）
let currentDay = 1; // 現在の日数
let difficultyLevel = ''; // 現在の難易度 ('easy', 'normal', 'hard')
let questionTimeLimit = 10; // 各問題の制限時間（秒） - 集中力で変動
let timerInterval; // タイマーのsetInterval ID
let timeLeft; // 残り時間
let gamePhase = 'start_menu'; // ゲームフェーズ ('start_menu', 'quiz_phase', 'after_school_phase', 'event_phase', 'game_over', 'dialogue_phase', 'location_selection_phase', 'mini_game_phase')

// プレイヤーのステータス
const playerStats = {
    academicAbility: 1, // 学力 (クイズの正答率や獲得スコアに影響)
    concentration: 1,   // 集中力 (問題の制限時間に影響)
    luck: 1             // 運 (ランダムイベントやボーナスに影響)
};

// その日の正解数と残りの放課後アクション回数
let correctAnswersToday = 0;
let availableAfterSchoolActions = 0;

// クラスメイトのデータ
const classmates = [
    { id: 'tanaka', name: '田中', affinity: 0, events: [
        { threshold: 5, message: '田中「今日の英語のクイズ、すごかったね！見直し手伝おうか？」', type: 'dialog', triggered: false },
        { threshold: 10, message: '田中「実は、学園祭の発表で英語劇をやりたいんだけど、手伝ってくれないかな？」', type: 'quest', triggered: false }
    ]},
    { id: 'sato', name: '佐藤', affinity: 0, events: [
        { threshold: 5, message: '佐藤「英語、得意なんだね。今度、一緒に勉強しない？」', type: 'dialog', triggered: false },
        { threshold: 10, message: '佐藤「SHOJI先生の特別補習があるらしいんだけど、一緒に行ってみない？」', type: 'quest', triggered: false }
    ]}
];

// ストーリーイベントと会話データ
const storyEvents = {
    intro: [
        { speaker: "SHOJI先生", text: "ようこそ、英単語道場へ！私はSHOJIだ！\n（難易度を選んだ後、**画面中央に現れる先生からのメッセージ（ポップアップ）**を読んで、その中の**点滅する「次へ」ボタン**をタップして進んでくれ！）" }, // ヒントをさらに明確に
        { speaker: "SHOJI先生", text: "君は今日から、この学園で英単語の力を磨いてもらう！" },
        { speaker: "SHOJI先生", text: "目指すは、一週間後の学園祭での英語劇の大成功だ！" },
        { speaker: "SHOJI先生", text: "さあ、準備はいいかい？難易度を選んで挑戦したまえ！" },
    ],
    daily_start: {
        1: [ { speaker: "SHOJI先生", text: "さあ、1日目だ！今日の英単語も気合いを入れて取り組むんだぞ！" } ],
        2: [ { speaker: "SHOJI先生", text: "2日目だな！昨日より少し難しい単語に挑戦してみるか？" } ],
        3: [ { speaker: "SHOJI先生", text: "3日目だ！単語の学習は継続が力になる。集中していくぞ！" } ],
        4: [
            { speaker: "SHOJI先生", text: "4日目だな。そろそろ中盤だ！" },
            { speaker: "クラスメイト(田中)", text: "（小声で）ねえ、今日のクイズ、ちょっと難しかったと思わない？" },
            { speaker: "プレイヤー", text: "（・・・確かに。でもSHOJI先生は頑張れって言うしな。）" },
            { speaker: "SHOJI先生", text: "どうした？雑談していないで、気合いを入れるんだ！" },
        ],
        5: [ { speaker: "SHOJI先生", text: "5日目！学園祭まで残りわずかだ！ラストスパートだぞ！" } ],
        6: [ { speaker: "SHOJI先生", text: "6日目！最終調整だ！今まで学んだ全てを出し切るんだ！" } ],
        7: [ { speaker: "SHOJI先生", text: "ついに7日目、学園祭当日だ！君の英語の力が試されるぞ！" } ]
    },
    game_end: [
        { speaker: "SHOJI先生", text: "これで全日程終了だ！君の努力は無駄ではなかった！" },
        { speaker: "SHOJI先生", text: "最終成績を発表する！" },
    ]
};

// 国際交流活動イベントの定義 (複数種類)
const internationalExchangeEvents = [
    {
        title: "異文化交流会で発表",
        content: "他国の文化に触れる交流会で、日本の文化について英語で発表した。自信がつき、学力が向上した。",
        effect: (miniGameScore) => {
            playerStats.academicAbility += 0.5 + miniGameScore * 0.05; // ミニゲームのスコアに応じて学力アップ
            playerStats.concentration += 0.2;
            shojiComment.textContent = '国際交流での発表、お見事！学力と集中力が上がったぞ！';
        }
    },
    {
        title: "留学生とのフリートーク",
        content: "留学生と英語でのフリートークを楽しんだ。最初は緊張したが、次第にスムーズに話せるようになった。",
        effect: (miniGameScore) => {
            playerStats.academicAbility += 0.3 + miniGameScore * 0.03;
            playerStats.luck += 0.2;
            classmates.forEach(c => c.affinity += 0.1); // 親密度も少し上がる
            shojiComment.textContent = '留学生との交流は良い経験だ！学力と運が上がったぞ！';
        }
    },
    {
        title: "英語ディベート大会の観戦",
        content: "ハイレベルな英語ディベート大会を観戦した。その論理的な展開と流暢さに感銘を受け、大いに刺激を受けた。",
        effect: (miniGameScore) => {
            playerStats.concentration += 0.4 + miniGameScore * 0.04;
            playerStats.academicAbility += 0.2;
            shojiComment.textContent = 'ディベート観戦で集中力が高まったな！君もいつかあの舞台に立てるぞ！！';
        }
    },
    {
        title: "国際的なチャリティイベント参加",
        content: "国際的なチャリティイベントにボランティアとして参加した。様々な国籍の人々と協力し、英語でコミュニケーションを取った。",
        effect: (miniGameScore) => {
            playerStats.luck += 0.4 + miniGameScore * 0.02;
            playerStats.academicAbility += 0.1;
            playerStats.concentration += 0.1;
            shojiComment.textContent = '国際的な貢献、素晴らしい！運と人間性が上がったな！';
        }
    }
];

// === DOM要素の取得 ===
const scoreDisplay = document.getElementById('score');
const blackboardWord = document.getElementById('blackboard-word');
const answerButtonsContainer = document.getElementById('answer-buttons');
const startButton = document.getElementById('start-button');
const feedbackMessage = document.getElementById('feedback-message');
const shojiComment = document.getElementById('shoji-comment');
const totalQuestionsDisplay = document.getElementById('total-questions');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const timerArea = document.getElementById('timer-area'); // タイマーエリア全体
const blackboardArea = document.getElementById('blackboard-area'); // 黒板エリア全体

// プレイヤー情報表示
const statAcademic = document.getElementById('stat-academic');
const statConcentration = document.getElementById('stat-concentration');
const statLuck = document.getElementById('stat-luck');
const currentDayDisplay = document.getElementById('current-day-display');

// 難易度選択UI
const difficultySelection = document.getElementById('difficulty-selection');
const difficultyButtons = document.querySelectorAll('.difficulty-button');

// 放課後アクションUI
const afterSchoolActions = document.getElementById('after-school-actions');
const actionStudy = document.getElementById('action-study');
const actionTalkClassmate = document.getElementById('action-talk-classmate');
const actionNextDay = document.getElementById('action-next-day');
const actionsLeftDisplay = document.getElementById('actions-left-display');
const remainingActionsSpan = document.getElementById('remaining-actions');

// 場所選択UI
const locationSelectionArea = document.getElementById('location-selection-area');
const locationButtons = document.querySelectorAll('.location-button');

// メッセージボックスの要素
const messageBox = document.getElementById('message-box');
const messageBoxOverlay = document.getElementById('message-box-overlay');
const messageBoxTitle = document.getElementById('message-box-title');
const messageBoxContent = document.getElementById('message-box-content');
const messageBoxCloseButton = document.getElementById('message-box-close');
const dialogueNextButton = document.getElementById('dialogue-next-button'); // 新しく追加した会話を進めるボタン

// 会話システムの状態
let currentDialogueSequence = [];
let currentDialogueIndex = 0;
let dialogueCallback = null; // 会話終了後に実行する関数

// サウンドシンセサイザーの初期化 (Tone.js)
const correctSynth = new Tone.Synth().toDestination();
const incorrectSynth = new Tone.PolySynth().toDestination();
let bgmLoop; // BGM用のループオブジェクト

// === ミニゲーム関連の変数とDOM要素 ===
const miniGameContainer = document.getElementById('falling-words-mini-game-container');
const fallingWordsCanvas = document.getElementById('fallingWordsCanvas');
const fwCtx = fallingWordsCanvas.getContext('2d');
const miniGameScoreDisplay = document.getElementById('mini-game-score');
const miniGameLivesDisplay = document.getElementById('mini-game-lives');
const miniGameOptionsContainer = document.getElementById('falling-words-options');
const startMiniGameButton = document.getElementById('start-mini-game-button');

let fallingWords = [];
let miniGameScore = 0;
let miniGameLives = 3; // 初期ライフ
let miniGameSpeed = 1; // 単語が落ちる速さ (調整: 0.5 -> 1)
let miniGameInterval; // requestAnimationFrame の ID
let currentFallingWordData = null; // 現在落ちている単語の情報 (english, correct, options)
let miniGameActive = false;
const wordFallSpeedMultiplier = 0.005; // 集中力による速度変化
const spawnInterval = 1000; // 新しい単語が出現する間隔 (ms)

// 新しい変数: ミニゲームセッションで最初の単語かどうかを追跡
let isFirstMiniGameWord = true;
let firstWordFallStartDelay = 1500; // 最初の単語が落下を開始するまでの遅延 (ms)

// 全単語リスト (300語) - ユーザー提供のクリーンなリストを使用
const rawWords = `create 創造する
base 基礎
repair 修理する
fail 失敗する
accept 受け入れる
belong 属する
exchange 交換する
complete 完成させる
treat 扱う
cross 横切る
hide 隠す
shake 振る
challenge 挑戦する
connect つなぐ
reply 返事をする
beat 打ち負かす
share 分かち合う
observe 観察する
mark しるしをつける
burn 燃やす
locate 位置する
fix 修理する
suit 最適である
destroy 破壊する
control 制御する
respond 返答する
depend 頼る
forgive 許す
attack 襲う
sink 沈む
appreciate 感謝する
feed 与える
success 成功
mystery 謎
ceremony 式典
schedule 予定
damage 御損害
model モデル
search 捜索
project 計画
form 形
scene 場面
accident 事故
contact 連絡
image イメージ
trust 信頼
quality 質
action 行動
lack 不足
spot 場所
truth 真実
effort 努力
type 型
site 敷地
tool 道具
couple 2人
hero 英雄
courage 勇気
board 板
purpose 目的
waste 無駄
shape 形
technique 技術
middle 中央
spirit 精神
partner パートナー
population 人口
fever 熱
method 方法
structure 構造
background 経歴
combination 組み合わせ
official 公式の
flat 平らな
serious 深刻な
ordinary 普通の
private 私的な
major 主要な
classical クラシックの
honest 正直な
excellent 優れた
whole 全体の
central 中心的な
ancient 古代の
fantastic すばらしい
regular 定期的な
basic 基本的な
huge 巨大な
empty 空の
smart 賢い
general 一般的な
single 1つの
responsible 責任のある
fresh 新鮮な
familiar 熟知している
native 出生地の
instant 即時の
lovely すてきな
clear 明白な
convenient 便利な
crazy 夢中で
funny おかしい
secret 秘密の
remote 遠くの
wake 目を覚ます
release 解放する
establish 設立する
examine 調べる
celebrate 祝う
float 漂う
recommend 推薦する
supply 供給する
disappear 消える
apologize 謝る
paint 塗る
pull 引く
print 印刷する
lift 持ち上げる
separate 分ける
melt 溶ける
strike 打つ
blow 吹く
let させる
roll 転がる
recover 回復する
surround 囲む
doubt 疑う
display 展示する
announce 発表する
support 支持する
act 行動する
repeat 繰り返す
count 数える
compare 比べる
shine 輝く
replace 取って代わる
reality 現実
strength 力
era 時代
area 地域
respect 尊敬
pressure 重圧
pleasure 喜び
favor 親切な行為
statue 像
limit 限度
bottom 下部
position 立場
memory 記憶
level 水準
figure 数
direction 方向
bit 少し
contrast 対比
religion 宗教
harmony 調和
pattern 模様
stage 段階
degree 程度
emergency 緊急事態
origin 起源
battle 戦闘
enemy 敵
note メモ
countryside 田舎
contest 競技
sort 種類
depth 深さ
top 頂上
theme テーマ
sentence 文
cycle 周期
concept 概念
rhythm リズム
tradition 伝統
theory 理論
correct 正しい
blank 空白の
quiet 静かな
smooth 滑らかな
wet 濡れた
chief 主要な
raw 生の
personal 個人の
double 2倍の
dirty 汚れた
normal 普通の
full いっぱいの
simple 簡単な
equal 等しい
quick 素早い
rapid 急速な
ideal 理想的な
rough 粗い
silent 静かな
violent 暴力的な
rich 豊富な
perfect 完璧な
weak 弱い
upper 上の
inner 内部の
awful ひどい
FALSE 間違った
vivid 鮮やかな
pure 純粋な
minor 重要でない
mild 穏やかな
admire 賞賛する
drop 落とす
reflect 映す
dig 掘る
beg 懇願する
freeze 凍る
adopt 採用する
measure 測る
flow 流れる
fulfill 実現させる
deliver 配達する
wrap 包む
knock ノックする
spell つづる
rush 急いで行く
pray 祈る
reject 拒絶する
protest 抗議する
handle 扱う
disturb 邪魔する
gather 集める
copy コピーする
press 押す
consist 成り立つ
assist 手助けする
kick 蹴る
link 結びつける
adjust 調整する
defend 守る
shut 閉める
bear 耐える
task 仕事
hug ハグ
clue 手がかり
percent パーセント
dozen 1ダース
ghost 幽霊
error 誤り
trend 傾向
thought 考え
alarm 警報
sample 見本
shadow 影
shade 日陰
standard 基準
hunger 飢え
appeal 訴え
harm 害
pile 山
plenty たくさん
edge 端
poison 毒
scale 規模
section 部門
attempt 試み
merit 長所
trick いたずら
second 少しの間
medium 媒体
unit 単位
ambition 願望
midnight 夜の12時
power 力
principle 信条
vision 展望
quarter 4分の1
luck 運
quantity 数量
fault 責任
somehow なんとかして
forever 永遠に
mostly 主に
forward 前へ
nowadays 近頃
ahead 前方に
apart 離れて
altogether まったく
throughout ～の間中
beyond ～の向こうに
toward ～の方向へ
within ～以内に
above ～の上に
below ～の下に
per ～につき
except ～を除いて
beside ～のそばに
unlike ～と違って
outside ～の外に
inside ～の中に
against ～に反対して
beneath ～の下に
plus ～を加えて
across ～を横切って
bring back 返す`;

// rawWordsを解析して、englishとcorrectのペアの配列を作成
parsedWords = rawWords.split('\n').map(line => {
    // 各行は "EnglishWord 日本語訳" の形式なので、最初のスペースで分割
    const parts = line.trim().split(' ');
    let english = parts[0].trim();
    // 2番目以降の要素を結合して日本語訳とする
    let correct = parts.slice(1).join(' ').trim();

    return { english, correct };
}).filter(q => q.english !== '' && q.correct !== ''); // 空の単語や意味を除外

// 全ての正しい意味のリストを作成 (選択肢生成用)
allUniqueMeanings = Array.from(new Set(parsedWords.map(q => q.correct).filter(m => m !== '')));

// 選択肢を生成する関数
function generateOptions(currentCorrectMeaning, allMeaningsPool) {
    const incorrectOptions = new Set();
    // 正しい意味を除外した選択肢プール (正しい意味と一致しないものだけを抽出)
    const availableMeaningsForIncorrect = allMeaningsPool.filter(m => m !== currentCorrectMeaning);

    // 3つの異なる不正解の選択肢を選ぶ
    // availableMeaningsForIncorrectのコピーを作成し、選択したものを削除していくことで重複を防ぐ
    let tempAvailable = [...availableMeaningsForIncorrect];
    while (incorrectOptions.size < 3 && tempAvailable.length > 0) {
        const randomIndex = Math.floor(Math.random() * tempAvailable.length);
        const selectedOption = tempAvailable[randomIndex];
        if (!incorrectOptions.has(selectedOption)) { // Setにより重複を避ける
            incorrectOptions.add(selectedOption);
        }
        tempAvailable.splice(randomIndex, 1); // 選択したものをプールから削除
    }

    // もし3つの不正解の選択肢が揃わなかった場合、ダミーの選択肢で埋める
    // ダミーの選択肢が既存の正しい意味と重複しないように、よりユニークな文字列を使用
    let dummyCounter = 1;
    while (incorrectOptions.size < 3) {
        const dummyOption = `誤訳${dummyCounter++}`;
        // ダミーが既存の正しい意味や既に選ばれた不正解の選択肢と重複しないことを確認
        if (!allUniqueMeanings.includes(dummyOption) && !incorrectOptions.has(dummyOption) && dummyOption !== currentCorrectMeaning) {
            incorrectOptions.add(dummyOption);
        }
        // 無限ループを防ぐためのブレーク条件（万が一ダミーも生成できない場合）
        if (dummyCounter > 10) break;
    }

    // 正しい選択肢と不正解の選択肢を結合
    let finalOptions = Array.from(incorrectOptions);
    finalOptions.push(currentCorrectMeaning); // 正しい意味を必ず追加

    // 最終チェック: もし何らかの理由で正しい意味が重複して追加された場合、Setで再度ユニークにする
    finalOptions = Array.from(new Set(finalOptions));

    // 全ての選択肢をシャッフル
    return shuffleArray(finalOptions);
}

// 全ての単語に選択肢を付与 (初期化時に一度だけ実行)
const questionsWithOptionsAll = parsedWords.map(q => ({
    english: q.english,
    correct: q.correct,
    options: generateOptions(q.correct, [...allUniqueMeanings])
}));

// 難易度別に単語を分配 (初期化時に一度だけ実行)
initialDifficultyWordSets = {
    easy: questionsWithOptionsAll.slice(0, 100),
    normal: questionsWithOptionsAll.slice(100, 200),
    hard: questionsWithOptionsAll.slice(200, 300)
};

// 配列をシャッフルするユーティリティ関数（Fisher-Yatesアルゴリズム）
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// === メッセージボックスおよび会話関連のヘルパー関数 ===

// メッセージボックスのUIを閉じるためのヘルパー関数 (handleMessageBoxCloseClickで内部的に使用)
function closeMessageBoxDisplay() {
    console.log('--- closeMessageBoxDisplay() called --- メッセージボックスを非表示にします。');
    messageBoxOverlay.style.display = 'none';
    messageBox.style.display = 'none';
    messageBox.classList.remove('opacity-100', 'scale-100'); // 表示アニメーションクラスを削除
    messageBox.classList.add('opacity-0', 'scale-95'); // 非表示状態に戻す
}

// メッセージボックスを表示する汎用関数
function showMessageBox(title, content, onComplete = null) {
    console.log(`--- showMessageBox() called --- タイトル: "${title}", コンテンツ: "${content}"`);
    messageBoxTitle.textContent = title;
    messageBoxContent.innerHTML = content; // HTMLコンテンツも受け入れるようにinnerHTMLを使用

    messageBoxOverlay.style.display = 'flex'; // オーバーレイを表示
    messageBox.style.display = 'block'; // メッセージボックスを表示

    // アニメーションをリセットして再適用
    messageBox.classList.remove('opacity-100', 'scale-100', 'opacity-0', 'scale-95');
    void messageBox.offsetWidth; // リフローを強制
    messageBox.classList.add('opacity-100', 'scale-100');


    if (onComplete) {
        // 会話モードでは「次へ」ボタンを使用し、「閉じる」は非表示
        dialogueNextButton.classList.remove('hidden');
        dialogueNextButton.classList.add('animate-pulse'); // 点滅アニメーション
        messageBoxCloseButton.classList.add('hidden');

        // 古いイベントリスナーを削除（重複防止）
        dialogueNextButton.removeEventListener('click', showNextDialogueLine); // displayDialogue用

        // 新しい一時的なリスナーを設定
        const tempListener = () => {
            console.log('showMessageBox: 「次へ」ボタン（一時的）がクリックされました。');
            dialogueNextButton.removeEventListener('click', tempListener); // 一度実行したら削除
            onComplete(); // 完了コールバックを実行
            closeMessageBoxDisplay(); // メッセージボックスを閉じる
            dialogueNextButton.classList.add('hidden'); // 閉じた後に「次へ」ボタンも隠す
            dialogueNextButton.classList.remove('animate-pulse'); // 点滅アニメーション解除
        };
        dialogueNextButton.addEventListener('click', tempListener);

    } else {
        // 通常のメッセージボックスでは「閉じる」ボタンのみ使用し、「次へ」は非表示
        messageBoxCloseButton.classList.remove('hidden');
        dialogueNextButton.classList.add('hidden');
        dialogueNextButton.classList.remove('animate-pulse'); // 点滅アニメーション解除

        // 「閉じる」ボタンのリスナーを再設定（重複防止）
        messageBoxCloseButton.removeEventListener('click', handleMessageBoxCloseClick);
        messageBoxCloseButton.addEventListener('click', handleMessageBoxCloseClick);
    }
}

// メッセージボックスの閉じるボタンがクリックされた時の統一ハンドラ (デフォルト)
// これは、onCompleteコールバックが設定されていない通常のメッセージボックス用
function handleMessageBoxCloseClick() {
    console.log('--- handleMessageBoxCloseClick() called --- 通常のメッセージボックスを閉じます。');
    closeMessageBoxDisplay(); // まずUIを閉じる

    // フェーズによって次のアクションを決定
    if (gamePhase === 'game_over') {
        // ゲームオーバー時のメッセージボックスを閉じたらスタートメニュー
        showStartMenu();
    } else if (gamePhase === 'dialogue_phase') {
        // 対話中に「閉じる」が押された場合（本来は「次へ」を使うが、念のため）
        shojiComment.textContent = '会話を中断したようだな。';
        // 会話を中断して、次の日のクイズを開始
        if (currentDay <= totalGameDays) {
            startQuizDay();
        } else {
            endGame();
        }
    }
    // その他の場合は、特に何もしない（`showMessageBox`の`onComplete`で制御されているはず）
}


// 対話進行用のヘルパー関数 (dialogueNextButton専用)
function showNextDialogueLine() {
    console.log('--- showNextDialogueLine() called --- currentDialogueIndex:', currentDialogueIndex, 'of', currentDialogueSequence.length);
    if (currentDialogueIndex < currentDialogueSequence.length) {
        const line = currentDialogueSequence[currentDialogueIndex];
        messageBoxTitle.textContent = line.speaker;
        messageBoxContent.innerHTML = line.text; // HTMLコンテンツも受け入れる
        currentDialogueIndex++;
        console.log(`表示中のメッセージ: ${line.speaker}: ${line.text}`);
    } else {
        console.log('--- showNextDialogueLine() --- 対話シーケンス終了。');
        closeMessageBoxDisplay();
        hideDialogueButtons(); // 会話ボタンを隠す（「次へ」も隠れる）

        // 点滅アニメーションを解除し、完全に隠す
        dialogueNextButton.classList.remove('animate-pulse');
        dialogueNextButton.classList.add('hidden');

        if (dialogueCallback) {
            console.log('showNextDialogueLine: dialogueCallbackを実行します。');
            const callbackToExecute = dialogueCallback; // コールバックを一時変数に保持
            dialogueCallback = null; // コールバックをクリア
            callbackToExecute(); // コールバックを実行
        } else {
            console.warn('showNextDialogueLine: dialogueCallbackが設定されていません。');
        }
    }
}


// 会話シーケンスを表示するメイン関数
function displayDialogue(dialogueArray, onCompleteCallback) {
    console.log('--- displayDialogue() called --- 会話を開始。');
    gamePhase = 'dialogue_phase';
    currentDialogueSequence = dialogueArray;
    currentDialogueIndex = 0;
    dialogueCallback = onCompleteCallback; // 会話終了後に実行するコールバックを保存

    // showMessageBoxのonCompleteを使用せず、showNextDialogueLineで直接進行を制御
    messageBoxOverlay.style.display = 'flex';
    messageBox.style.display = 'block';

    // アニメーションをリセットして再適用
    messageBox.classList.remove('opacity-100', 'scale-100', 'opacity-0', 'scale-95');
    void messageBox.offsetWidth; // リフローを強制
    messageBox.classList.add('opacity-100', 'scale-100');

    dialogueNextButton.classList.remove('hidden');
    dialogueNextButton.classList.add('animate-pulse'); // 点滅アニメーション
    messageBoxCloseButton.classList.add('hidden'); // 会話中は「閉じる」ボタンを隠す

    // 古いイベントリスナーを削除（重複防止）
    dialogueNextButton.removeEventListener('click', showNextDialogueLine);

    // displayDialogue専用のリスナーを追加
    dialogueNextButton.addEventListener('click', showNextDialogueLine);

    showNextDialogueLine(); // 最初の会話ラインを表示
}

// 会話関連のボタンを隠すヘルパー関数 (showMessageBoxとdisplayDialogueで共有)
function hideDialogueButtons() {
    dialogueNextButton.classList.add('hidden');
    messageBoxCloseButton.classList.remove('hidden'); // 一般的なメッセージ用には表示を維持
}


// === BGMの初期化と再生 ===
function setupBGM() {
    console.log('setupBGM: BGMシンセサイザーを初期化中...');
    const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
            attack: 2,
            decay: 1,
            sustain: 0.5,
            release: 2
        }
    }).toDestination();

    bgmLoop = new Tone.Loop(time => {
        synth.triggerAttackRelease(['C3', 'E3', 'G3', 'C4'], '4n', time);
    }, '4n');

    Tone.Destination.volume.value = -15;
    console.log('setupBGM: BGMシンseサイザーの初期化完了。');
}

// === ゲームのメインロジック関数 ===

// ゲームを初期状態にする（難易度選択画面）
function showStartMenu() {
    console.log('--- showStartMenu() called --- ゲーム開始メニューを表示');
    gamePhase = 'start_menu';
    score = 0;
    currentDay = 1;
    playerStats.academicAbility = 1;
    playerStats.concentration = 1;
    playerStats.luck = 1;
    classmates.forEach(c => {
        c.affinity = 0;
        c.events.forEach(e => e.triggered = false);
    });
    correctAnswersToday = 0;
    availableAfterSchoolActions = 0;
    miniGameQuestionCount = 0; // ミニゲームのカウントもリセット

    updatePlayerStatsDisplay();
    scoreDisplay.textContent = '0';
    totalQuestionsDisplay.textContent = '100';

    shojiComment.textContent = 'SHOJI先生の英単語道場へようこそ！難易度を選んでゲームを始めよう！';
    blackboardWord.textContent = '難易度を選択してください';
    blackboardWord.classList.remove('blackboard-word-animated');
    feedbackMessage.classList.add('hidden');
    startButton.classList.add('hidden');
    timerArea.classList.add('hidden');
    answerButtonsContainer.innerHTML = '';
    answerButtonsContainer.classList.add('hidden');
    afterSchoolActions.classList.add('hidden');
    locationSelectionArea.classList.add('hidden');
    difficultySelection.classList.remove('hidden');
    hideDialogueButtons();
    hideFallingWordsMiniGame();

    if (bgmLoop && bgmLoop.state === 'started') {
        bgmLoop.stop();
    }
    Tone.Destination.volume.value = -Infinity;
}

// 難易度選択後のゲーム初期化
function initializeGame(selectedDifficulty) {
    console.log('--- initializeGame() called --- ゲームを初期化中。難易度:', selectedDifficulty);
    difficultyLevel = selectedDifficulty;
    currentQuestionIndex = 0;
    score = 0;
    currentDay = 1;

    playerStats.academicAbility = 1;
    playerStats.concentration = 1;
    playerStats.luck = 1;
    classmates.forEach(c => {
        c.affinity = 0;
        c.events.forEach(e => e.triggered = false);
    });
    correctAnswersToday = 0;
    availableAfterSchoolActions = 0;
    miniGameQuestionCount = 0; // ミニゲームのカウントをリセット

    updatePlayerStatsDisplay();
    scoreDisplay.textContent = score;
    totalQuestionsDisplay.textContent = initialDifficultyWordSets[difficultyLevel].length;

    currentSessionRemainingQuestions = shuffleArray([...initialDifficultyWordSets[difficultyLevel]]);

    shojiComment.textContent = '準備はいいかい？さあ、今日の英単語だ！';
    feedbackMessage.classList.add('hidden');
    startButton.classList.add('hidden');
    difficultySelection.classList.add('hidden');
    timerArea.classList.add('hidden');
    hideFallingWordsMiniGame();

    // 音声の初期化を試みる (ユーザー操作で許可される)
    Tone.start().then(() => {
        console.log('initializeGame: Tone.start() 成功。BGM再生開始を試みます。');
        if (bgmLoop) {
            bgmLoop.start(0);
            Tone.Destination.volume.value = -15; // BGM音量設定
        } else {
            setupBGM();
            bgmLoop.start(0);
            Tone.Destination.volume.value = -15; // BGM音量設定
        }
    }).catch(e => {
        console.error('initializeGame: Tone.start() エラー:', e);
        shojiComment.textContent = '音声の初期化に失敗したようだ…もしかしたら、どこか画面をクリックして音声を有効にしてみてくれ！';
    });

    // 音声の準備状況に関わらず、導入会話をすぐに開始する
    console.log('initializeGame: 導入会話 (displayDialogue) を呼び出します。');
    displayDialogue(storyEvents.intro, startQuizDay); // 導入会話が終了したらクイズ開始
}

// プレイヤーのステータス表示を更新
function updatePlayerStatsDisplay() {
    statAcademic.textContent = playerStats.academicAbility.toFixed(1); // 小数点以下1桁まで表示
    statConcentration.textContent = playerStats.concentration.toFixed(1);
    statLuck.textContent = playerStats.luck.toFixed(1);
    currentDayDisplay.textContent = `${currentDay}日目`;
}

// クイズフェーズを開始 (各日の始まりに呼び出される)
function startQuizDay() {
    console.log('--- startQuizDay() called --- クイズフェーズを開始。');
    gamePhase = 'quiz_phase';
    currentQuestionIndex = 0; // その日の問題のインデックスをリセット
    correctAnswersToday = 0; // その日の正解数をリセット
    answerButtonsContainer.classList.remove('hidden'); // クイズボタンを表示
    timerArea.classList.remove('hidden'); // タイマーを表示
    feedbackMessage.classList.add('hidden'); // フィードバックメッセージを隠す
    blackboardArea.classList.remove('hidden'); // 黒板を表示

    // その日のための10問を、セッションの残りプールから取り出す
    currentGameDayQuestions = [];
    for (let i = 0; i < totalQuestionsPerDay; i++) {
        if (currentSessionRemainingQuestions.length > 0) {
            currentGameDayQuestions.push(currentSessionRemainingQuestions.shift());
        } else {
            console.warn("全問題が枯渇しました！ゲームを終了します。");
            endGame();
            return;
        }
    }

    // その日の開始会話イベントをチェック
    const dailyDialogue = storyEvents.daily_start[currentDay];
    if (dailyDialogue) {
        console.log('startQuizDay: 日次会話を開始します。');
        displayDialogue(dailyDialogue, displayQuestion); // 会話表示後、問題表示へ
    } else {
        displayQuestion(); // 会話がなければ直接問題表示へ
    }
}

// 問題を表示する関数
function displayQuestion() {
    console.log('--- displayQuestion() called --- 問題を表示。問題インデックス:', currentQuestionIndex);
    if (currentQuestionIndex >= currentGameDayQuestions.length) {
        endQuizDay();
        return;
    }

    const currentQuestion = currentGameDayQuestions[currentQuestionIndex];
    blackboardWord.classList.remove('blackboard-word-animated');
    void blackboardWord.offsetWidth; // リフローを強制してアニメーションを再トリガー
    blackboardWord.textContent = currentQuestion.english;
    blackboardWord.classList.add('blackboard-word-animated');

    const allOptions = currentQuestion.options;
    answerButtonsContainer.innerHTML = '';
    enableAnswerButtons();

    allOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add(
            'answer-button',
            'px-6', 'py-4', 'bg-blue-500', 'text-white', 'text-xl', 'font-semibold',
            'rounded-xl', 'shadow-md', 'hover:bg-blue-600', 'transition', 'duration-300',
            'ease-in-out', 'transform', 'active:scale-98', 'focus:outline-none', 'focus:ring-2',
            'focus:ring-blue-400', 'focus:ring-opacity-75'
        );
        button.dataset.answer = option;
        button.addEventListener('click', handleAnswerClick);
        answerButtonsContainer.appendChild(button);
    });

    feedbackMessage.classList.add('hidden');
    shojiComment.textContent = `第${currentQuestionIndex + 1}問！この単語の意味は？`;

    // 集中力に基づいて制限時間を設定
    questionTimeLimit = 10 + (Math.floor(playerStats.concentration) - 1) * 2;
    if (questionTimeLimit < 5) questionTimeLimit = 5; // 最低時間を保証
    startTimer();
}

// タイマーを開始する関数
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = questionTimeLimit;
    timerText.textContent = `残り時間: ${timeLeft}秒`;
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = '#22c55e'; // 緑色

    timerInterval = setInterval(() => {
        timeLeft--;
        timerText.textContent = `残り時間: ${timeLeft}秒`;
        const percentage = (timeLeft / questionTimeLimit) * 100;
        timerBar.style.width = `${percentage}%`;

        if (percentage <= 25) {
            timerBar.style.backgroundColor = '#ef4444'; // 赤色
        } else if (percentage <= 50) {
            timerBar.style.backgroundColor = '#facc15'; // 黄色
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleAnswer(null); // 時間切れは不正解として処理
        }
    }, 1000);
}

// 回答ボタンがクリックされた時の処理
function handleAnswerClick(event) {
    clearInterval(timerInterval);
    const selectedAnswer = event.target.dataset.answer;
    handleAnswer(selectedAnswer);
}

// 回答を処理する共通関数
function handleAnswer(selectedAnswer) {
    disableAnswerButtons();
    const currentQuestion = currentGameDayQuestions[currentQuestionIndex];

    let message = '';
    let animationClass = '';

    // まずアニメーションクラスを削除してリセットし、リフローを強制してアニメーションの再トリガーを確実にする
    blackboardArea.classList.remove('blackboard-flash-correct', 'blackboard-shake-incorrect');
    void blackboardArea.offsetWidth; // リフローを強制

    if (selectedAnswer === currentQuestion.correct) {
        score++;
        correctAnswersToday++;
        scoreDisplay.textContent = score;
        message = '正解！素晴らしい！';
        feedbackMessage.classList.remove('text-red-600', 'hidden');
        feedbackMessage.classList.add('text-green-600', 'block');
        shojiComment.textContent = 'Excellent! その調子だ！';
        playCorrectSound();
        playerStats.academicAbility += 0.1 * (1 + playerStats.luck * 0.05); // 運が学力UPに影響
        if (Math.random() < playerStats.luck * 0.1) { // 運に基づいてボーナススコア
            score++;
            scoreDisplay.textContent = score;
            message += ' (運ボーナス！)';
        }
        animationClass = 'blackboard-flash-correct'; // 正解アニメーションクラスを設定
    } else {
        message = `不正解... 正解は「${currentQuestion.correct}」だよ。`;
        feedbackMessage.classList.remove('text-green-600', 'hidden');
        feedbackMessage.classList.add('text-red-600', 'block');
        shojiComment.textContent = 'Don\'t worry, next time! 諦めるな！';
        playIncorrectSound();
        playerStats.academicAbility = Math.max(1, playerStats.academicAbility - 0.05); // 不正解で少し下がる
        animationClass = 'blackboard-shake-incorrect'; // 不正解アニメーションクラスを設定
    }
    updatePlayerStatsDisplay();

    // SHOJI先生の特別なコメント
    if (correctAnswersToday >= 3 && correctAnswersToday < 5 && currentQuestionIndex < currentGameDayQuestions.length - 1) {
        shojiComment.textContent = '君の成長は目覚ましいな！この調子で頑張りたまえ！';
    } else if (correctAnswersToday >= 5 && currentQuestionIndex < currentGameDayQuestions.length - 1) {
        shojiComment.textContent = '素晴らしい集中力だ！君はきっと大物になるぞ！';
    }

    currentQuestionIndex++;

    // アニメーションを適用
    blackboardArea.classList.add(animationClass);

    // アニメーション終了後にメッセージボックスを表示するリスナーを設定
    const onAnimationEnd = () => {
        blackboardArea.classList.remove(animationClass); // アニメーションクラスを削除してリセット
        blackboardArea.removeEventListener('animationend', onAnimationEnd); // イベントリスナーを一度だけ実行するために削除

        showMessageBox('結果', message, () => {
            if (currentQuestionIndex < currentGameDayQuestions.length) {
                displayQuestion(); // 次の問題へ
            } else {
                endQuizDay(); // 全問終了したらその日のクイズを終了
            }
        });
    };
    blackboardArea.addEventListener('animationend', onAnimationEnd);
}

// 回答ボタンを有効にする関数
function enableAnswerButtons() {
    const buttons = answerButtonsContainer.querySelectorAll('.answer-button');
    buttons.forEach(button => {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    });
}

// 回答ボタンを無効にする関数
function disableAnswerButtons() {
    const buttons = answerButtonsContainer.querySelectorAll('.answer-button');
    buttons.forEach(button => {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    });
}

// 正解音を再生する関数 (Tone.js)
function playCorrectSound() {
    // Tone.jsのコンテキストがサスペンド状態の場合、再開を試みる
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            correctSynth.triggerAttackRelease('C5', '8n');
        }).catch(e => console.error("Could not resume audio context for correct sound:", e));
    } else {
        correctSynth.triggerAttackRelease('C5', '8n');
    }
}

// 不正解音を再生する関数 (Tone.js)
function playIncorrectSound() {
    // Tone.jsのコンテキストがサスペンド状態の場合、再開を試みる
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            incorrectSynth.triggerAttackRelease(['C3', 'F#3'], '8n');
        }).catch(e => console.error("Could not resume audio context for incorrect sound:", e));
    } else {
        incorrectSynth.triggerAttackRelease(['C3', 'F#3'], '8n');
    }
}

// その日のクイズ終了時の処理
function endQuizDay() {
    console.log('--- endQuizDay() called --- クイズ終了。');
    clearInterval(timerInterval);
    gamePhase = 'after_school_phase';
    shojiComment.textContent = `今日の授業は終わりだ！${correctAnswersToday}問正解したぞ！放課後をどう過ごす？`;
    blackboardWord.textContent = '放課後';
    blackboardWord.classList.remove('blackboard-word-animated');
    answerButtonsContainer.innerHTML = '';
    answerButtonsContainer.classList.add('hidden');
    startButton.classList.add('hidden');
    feedbackMessage.classList.add('hidden');
    timerArea.classList.add('hidden');
    blackboardArea.classList.add('hidden'); // クイズ終了後は黒板を隠す

    availableAfterSchoolActions = correctAnswersToday; // 正解数に応じて放課後アクション回数を付与
    showAfterSchoolActions(); // 放課後アクションを表示
}

// 放課後アクションを表示する関数
function showAfterSchoolActions() {
    console.log('--- showAfterSchoolActions() called --- 放課後アクションを表示。');
    afterSchoolActions.classList.remove('hidden');
    // 放課後アクションがまとめられたことを示唆する表示に変更
    if (correctAnswersToday > 0) { // correctAnswersToday を参照
        remainingActionsSpan.textContent = `今日の成果をまとめて使う！`;
    } else {
        remainingActionsSpan.textContent = `（今日の成果なし）`;
    }


    // 勉強と交流ボタンは、正解数が1以上の場合のみ可能
    if (correctAnswersToday > 0) { // availableAfterSchoolActions ではなく correctAnswersToday を参照
        actionStudy.disabled = false;
        actionTalkClassmate.disabled = false;
        actionStudy.classList.remove('opacity-50', 'cursor-not-allowed');
        actionTalkClassmate.classList.remove('opacity-50', 'cursor-not-allowed');
        actionNextDay.disabled = true; // 特別なアクションを選んだら次の日へ自動移行するので、ここでは無効
        actionNextDay.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        // 正解数が0の場合は、勉強も交流もできない。次の日へ進むボタンのみ有効
        actionStudy.disabled = true;
        actionTalkClassmate.disabled = true;
        actionStudy.classList.add('opacity-50', 'cursor-not-allowed');
        actionTalkClassmate.classList.add('opacity-50', 'cursor-not-allowed');
        actionNextDay.disabled = false; // 次の日へボタンを有効化
        actionNextDay.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// 放課後アクションの処理
function handleAfterSchoolAction(actionType) {
    console.log('--- handleAfterSchoolAction() called --- アクションタイプ:', actionType);

    if (actionType === 'next_day') {
        hideGameElements();
        showLocationSelection();
        return;
    }

    // 勉強や交流アクションは、正解数が1以上の場合のみ可能
    // ユーザーの要望により、1度のアクションでまとめて効果を適用する
    if (correctAnswersToday <= 0) { // availableAfterSchoolActions ではなく correctAnswersToday を参照
        showMessageBox('アクション不可', '今日の正解数が0なので、特別なアクションは選べないぞ。次の日へ進もう！', () => {
            hideGameElements();
            showLocationSelection(); // そのまま次の日へ
        });
        return; // ここで処理を中断
    }

    feedbackMessage.classList.add('hidden');

    let messageTitle = '';
    let messageContent = '';
    let shojiSenseiMessage = '';

    // アクションを実行したら、その日のアクションはすべて消費したものとみなす
    availableAfterSchoolActions = 0; // 実質的な消費（次の日にはリセットされるが念のため）

    switch (actionType) {
        case 'study':
            // ユーザーの要望に応じて、今日の正解数に応じた固定ボーナス
            // 正解数が多いほど、より大きな効果が得られるように調整可能
            const studyBonusAcademic = 1 + Math.floor(correctAnswersToday / 2); // 例: 2問正解ごとに学力1UP
            const studyBonusConcentration = 0.5 + Math.floor(correctAnswersToday / 4); // 例: 4問正解ごとに集中力0.5UP
            playerStats.academicAbility += studyBonusAcademic;
            playerStats.concentration += studyBonusConcentration;
            
            messageTitle = '集中学習！';
            messageContent = `今日の努力をまとめて、学力が${studyBonusAcademic.toFixed(1)}ポイント、集中力が${studyBonusConcentration.toFixed(1)}ポイント上がった！`;
            shojiSenseiMessage = `よし、今日の成果をまとめて強化したな！学力と集中力が大きく上がったぞ！`;
            break;
        case 'talk_classmate':
            const randomClassmate = classmates[Math.floor(Math.random() * classmates.length)];
            const talkBonusAffinity = 2 + Math.floor(correctAnswersToday / 2); // 例: 2問正解ごとに親密度2UP
            const talkBonusLuck = 0.1 + Math.floor(correctAnswersToday / 5) * 0.1; // 例: 5問正解ごとに運0.1UP
            randomClassmate.affinity += talkBonusAffinity;
            playerStats.luck += talkBonusLuck;

            messageTitle = '深い交流！';
            messageContent = `${randomClassmate.name}とじっくり話した。親密度が${talkBonusAffinity.toFixed(1)}ポイント、運が${talkBonusLuck.toFixed(1)}ポイント上がった！`;
            shojiSenseiMessage = `${randomClassmate.name}と深く交流したぞ！親密度が大きく上がり、運も少し上がった！`;
            checkClassmateEvents(randomClassmate); // 親密度イベントをチェック
            break;
    }

    updatePlayerStatsDisplay(); // ステータス表示を更新

    shojiComment.textContent = shojiSenseiMessage; // SHOJI先生のコメントを更新

    // 結果メッセージボックスを表示し、閉じたら次の日へ移行
    showMessageBox(messageTitle, messageContent, () => {
        hideGameElements();
        showLocationSelection(); // すぐに次の日へ進む
    });
}

// クラスメイトの親密度イベントをチェック
function checkClassmateEvents(classmate) {
    classmate.events.forEach(event => {
        if (classmate.affinity >= event.threshold && !event.triggered) {
            event.triggered = true;
            // イベントメッセージボックスを閉じたら、引き続き放課後アクションを表示
            // ただし、今回は直接次の日へ行くため、コールバックは不要だが、念のため残す
            showMessageBox(`${classmate.name}とのイベント`, event.message, null); // ここで null を渡して、メッセージボックスを閉じたら自動で進まないようにする (実際には次の日のフローで上書きされる)
        }
    });
}

// === 場所選択関連の関数 ===
function showLocationSelection() {
    console.log('--- showLocationSelection() called --- 場所選択画面を表示。');
    gamePhase = 'location_selection_phase';
    shojiComment.textContent = 'さて、今日の目的地はどこだ？';
    blackboardWord.textContent = '目的地を選ぼう';
    blackboardWord.classList.remove('blackboard-word-animated'); // アニメーションをリセット
    blackboardWord.classList.add('blackboard-word-animated');
    blackboardArea.classList.remove('hidden'); // 黒板を表示

    // 場所選択エリアを表示
    locationSelectionArea.classList.remove('hidden');
}

function handleLocationSelection(locationType) {
    console.log('--- handleLocationSelection() called --- 場所選択:', locationType);
    locationSelectionArea.classList.add('hidden'); // 場所選択エリアを隠す

    // 日数を進めるのは場所選択後に決定
    currentDay++;
    updatePlayerStatsDisplay(); // 日数表示を更新

    if (currentDay > totalGameDays) {
        endGame(); // 全日程終了
        return;
    }

    if (locationType === 'school') {
        shojiComment.textContent = 'よし、今日も学校で英単語を学ぶぞ！';
        showMessageBox('学校へ', '学校へ向かった。今日の授業が始まるぞ！', startQuizDay);
    } else if (locationType === 'internationalExchange') {
        shojiComment.textContent = '国際交流活動に参加するようだな！特別なミニゲームに挑戦だ！';
        showMessageBox('国際交流活動へ', '今日は国際交流活動だ！「英単語キャッチ！」ゲームで実力を試そう！', showFallingWordsMiniGame); // ミニゲーム開始
    }
}
// === 場所選択関連の関数 終わり ===


// === ミニゲーム関連の関数 ===
// キャンバスのサイズを親要素に合わせて調整する関数
function resizeCanvas() {
    console.log('resizeCanvas: キャンバスサイズを調整中...');
    // 親要素のクライアントサイズを取得
    const containerWidth = miniGameContainer.clientWidth;
    const containerHeight = miniGameContainer.clientHeight;

    // キャンバスの描画サイズをコンテナに合わせる
    fallingWordsCanvas.width = containerWidth;
    fallingWordsCanvas.height = containerHeight;

    console.log(`resizeCanvas: 新しいキャンバスサイズ - 幅: ${fallingWordsCanvas.width}, 高さ: ${fallingWordsCanvas.height}`);

    // 必要であれば、現在の描画をクリアして再描画
    fwCtx.clearRect(0, 0, fallingWordsCanvas.width, fallingWordsCanvas.height);
    // 単語が落下中の場合は再描画
    if (currentFallingWordData) {
        // X座標を新しいキャンバスの中央に調整 (リサイズ中に中央に留まるように)
        currentFallingWordData.x = fallingWordsCanvas.width / 2;
        drawFallingWords();
    }
}


function showFallingWordsMiniGame() {
    console.log('--- showFallingWordsMiniGame() called --- ミニゲーム画面を表示。');
    gamePhase = 'mini_game_phase';
    hideGameElements(); // メインゲームのUIを全て隠す
    miniGameContainer.classList.remove('hidden'); // ミニゲームコンテナを表示
    startMiniGameButton.classList.remove('hidden'); // ミニゲーム開始ボタンを表示
    shojiComment.textContent = '国際交流活動へようこそ！英単語キャッチで腕試しだ！';
    miniGameScoreDisplay.textContent = '0';
    miniGameLivesDisplay.textContent = '3';
    fwCtx.clearRect(0, 0, fallingWordsCanvas.width, fallingWordsCanvas.height); // キャンバスをクリア
    miniGameOptionsContainer.innerHTML = ''; // オプションボタンをクリア

    // キャンバスのリサイズを確実に行う
    resizeCanvas();

    // ミニゲーム開始ボタンのイベントリスナーを再設定（重複防止）
    startMiniGameButton.removeEventListener('click', startFallingWordsGame);
    startMiniGameButton.addEventListener('click', startFallingWordsGame);
}

function startFallingWordsGame() {
    console.log('--- startFallingWordsGame() called --- ミニゲームを開始。');
    startMiniGameButton.classList.add('hidden'); // 開始ボタンを隠す
    miniGameActive = true;
    miniGameScore = 0;
    miniGameLives = 3;
    miniGameQuestionCount = 0; // ミニゲームの出題数をリセット
    fallingWords = []; // 落ちる単語をリセット
    miniGameScoreDisplay.textContent = miniGameScore;
    miniGameLivesDisplay.textContent = miniGameLives;
    currentFallingWordData = null; // 現在落ちている単語をリセット

    // Tone.jsのコンテキストを再開（ユーザー操作で）
    Tone.start();

    // ミニゲームセッションの初回単語フラグをリセット
    isFirstMiniGameWord = true;

    // 最初の単語を生成
    generateFallingWord(); // ここで currentFallingWordData がセットされる

    // ゲームループ開始をすぐに行う
    if (miniGameInterval) {
        cancelAnimationFrame(miniGameInterval);
    }
    gameLoop(0); // タイムスタンプ0から開始
}

let previousTimestamp = 0;
function gameLoop(timestamp) {
    if (!miniGameActive) return;

    const deltaTime = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    fwCtx.clearRect(0, 0, fallingWordsCanvas.width, fallingWordsCanvas.height);

    if (currentFallingWordData) {
        // 最初の単語に対する特別な初期遅延処理
        if (currentFallingWordData.initialDelayTimer !== undefined && currentFallingWordData.initialDelayTimer > 0) {
            currentFallingWordData.initialDelayTimer -= deltaTime;
            // 遅延中はY座標を更新しない（単語は静止したまま）
        } else {
            // 遅延が終了したか、最初の単語ではない場合、通常の落下ロジックを適用
            if (currentFallingWordData.y === -50 && isFirstMiniGameWord) {
                // 遅延終了後、初めて単語を画面の最上部に移動させる
                currentFallingWordData.y = 0;
                isFirstMiniGameWord = false; // 初回単語フラグを解除
                console.log("Mini-game: First word fall delay finished, setting Y to 0 and starting to fall.");
            }
            const adjustedSpeed = miniGameSpeed + playerStats.concentration * wordFallSpeedMultiplier;
            currentFallingWordData.y += adjustedSpeed * (deltaTime / 16);
        }

        drawFallingWords();

        // 単語が下まで落ちたか判定
        // 単語の表示Y位置を考慮して、キャンバスの下端に到達したかを確認
        if (currentFallingWordData.y >= fallingWordsCanvas.height - 40) {
            miniGameLives--;
            miniGameLivesDisplay.textContent = miniGameLives;
            playIncorrectSound(); // 不正解音
            console.log('ミニゲーム: 単語が地面に到達。残りライフ:', miniGameLives);

            // ライフが0になったか、または10問出題されたらゲーム終了
            if (miniGameLives <= 0 || miniGameQuestionCount >= totalQuestionsPerDay) {
                endFallingWordsGame();
            } else {
                currentFallingWordData = null; // 現在の単語をクリア
                // 次の単語を生成する前に、短いインターバルを置く
                setTimeout(() => {
                    if (miniGameActive) { // ゲームがアクティブな場合のみ
                        generateFallingWord();
                    }
                }, spawnInterval); // spawnInterval を利用
            }
        }
    }

    miniGameInterval = requestAnimationFrame(gameLoop);
}

function drawFallingWords() {
    if (!currentFallingWordData) return;

    fwCtx.font = '36px "Inter", sans-serif';
    fwCtx.fillStyle = '#ADD8E6'; // 明るい青
    fwCtx.textAlign = 'center';
    fwCtx.fillText(currentFallingWordData.english, currentFallingWordData.x, currentFallingWordData.y);
}

function generateFallingWord() {
    console.log('ミニゲーム: 新しい単語を生成。');

    // 10問出題されたらミニゲームを終了
    if (miniGameQuestionCount >= totalQuestionsPerDay) {
        console.log('ミニゲーム: 10問出題されたため終了します。');
        endFallingWordsGame();
        return;
    }

    currentFallingWordData = null; // 前の単語データを確実にクリア

    // ミニゲーム用に用意する単語プールが足りなくなった場合の処理
    if (currentSessionRemainingQuestions.length === 0) {
        console.log('ミニゲーム: 残りの問題がありません。終了します。');
        endFallingWordsGame();
        return;
    }

    const nextWord = currentSessionRemainingQuestions.shift(); // セッションの単語プールから取得
    currentFallingWordData = {
        english: nextWord.english,
        correct: nextWord.correct,
        options: shuffleArray([...nextWord.options]), // 選択肢もシャッフル
        x: fallingWordsCanvas.width / 2, // 中央に表示
        y: -50, // 初期位置をキャンバスの上部（画面外だが0に近く）に設定
        speed: miniGameSpeed
    };

    // 最初の単語の場合のみ、落下開始までのタイマーを設定
    if (isFirstMiniGameWord) {
        currentFallingWordData.initialDelayTimer = firstWordFallStartDelay;
        console.log("Mini-game: First word generated with initial delay timer.");
    }

    miniGameQuestionCount++; // 出題数をインクリメント
    console.log(`ミニゲーム: 第${miniGameQuestionCount}問目、単語: "${currentFallingWordData.english}" 生成。初期Y: ${currentFallingWordData.y}`); // ログ追加
    displayMiniGameOptions(currentFallingWordData.options); // 追加された関数呼び出し
}

// ミニゲームの選択肢ボタンを表示する関数
function displayMiniGameOptions(options) {
    console.log('displayMiniGameOptions: ミニゲームの選択肢を生成中...');
    miniGameOptionsContainer.innerHTML = ''; // 既存のボタンをクリア

    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add(
            'mini-game-option-button', // ミニゲーム用の新しいクラス
            'px-6', 'py-3', 'bg-purple-500', 'text-white', 'text-xl', 'font-semibold',
            'rounded-xl', 'shadow-md', 'hover:bg-purple-600', 'transition', 'duration-300',
            'transform', 'active:scale-98', 'focus:outline-none', 'focus:ring-2',
            'focus:ring-purple-400', 'focus:ring-opacity-75'
        );
        button.dataset.answer = option;
        button.addEventListener('click', handleMiniGameOptionClick);
        miniGameOptionsContainer.appendChild(button);
    });
    console.log('displayMiniGameOptions: ミニゲームの選択肢生成完了。');
}


function handleMiniGameOptionClick(event) {
    if (!miniGameActive || !currentFallingWordData) return;

    const selectedAnswer = event.target.dataset.answer;
    console.log('ミニゲーム: 選択された回答:', selectedAnswer);

    if (selectedAnswer === currentFallingWordData.correct) {
        miniGameScore++;
        miniGameScoreDisplay.textContent = miniGameScore;
        playCorrectSound();
        shojiComment.textContent = 'Great job! その調子だ！';
    } else {
        miniGameLives--;
        miniGameLivesDisplay.textContent = miniGameLives;
        playIncorrectSound();
        shojiComment.textContent = 'Oh no! 気を落とすな！';
    }

    // 現在の単語データをクリック処理後にクリア
    currentFallingWordData = null;

    // ライフが0になったか、または10問出題されたらゲーム終了
    if (miniGameLives <= 0 || miniGameQuestionCount >= totalQuestionsPerDay) {
        endFallingWordsGame();
    } else {
        // 次の単語を生成する前に、短いインターバルを置く
        setTimeout(() => {
            if (miniGameActive) { // ゲームがアクティブな場合のみ
                generateFallingWord();
            }
        }, spawnInterval); // spawnInterval を利用
    }
}

function endFallingWordsGame() {
    console.log('--- endFallingWordsGame() called --- ミニゲーム終了。');
    miniGameActive = false;
    cancelAnimationFrame(miniGameInterval);
    fwCtx.clearRect(0, 0, fallingWordsCanvas.width, fallingWordsCanvas.height); // キャンバスをクリア
    miniGameOptionsContainer.innerHTML = ''; // オプションボタンをクリア

    let miniGameResultText = '';
    let academicChange = 0;
    let concentrationChange = 0;

    if (miniGameLives <= 0) { // ライフが0で終了した場合
        miniGameResultText = `ミニゲーム終了！ライフが0になったぞ... スコア: ${miniGameScore}点`;
        academicChange = -0.1; // 失敗すると少し下がる
        concentrationChange = -0.1;
    } else if (miniGameQuestionCount >= totalQuestionsPerDay) { // 10問出題されて終了した場合
        miniGameResultText = `ミニゲーム終了！${miniGameQuestionCount}問中${miniGameScore}問正解！素晴らしいスコアだ！`;
        academicChange = 0.3 + miniGameScore * 0.05; // スコアに応じて学力アップ
        concentrationChange = 0.2 + miniGameScore * 0.03; // スコアに応じて集中力アップ
    } else { // 想定外の終了（念のため）
        miniGameResultText = `ミニゲームが終了したぞ！ スコア: ${miniGameScore}点`;
        academicChange = 0.1;
        concentrationChange = 0.1;
    }

    // メインゲームのスコアにミニゲームスコアを加算
    score += miniGameScore;
    scoreDisplay.textContent = score; // スコア表示を更新

    playerStats.academicAbility = Math.max(1, playerStats.academicAbility + academicChange);
    playerStats.concentration = Math.max(1, playerStats.concentration + concentrationChange);
    updatePlayerStatsDisplay();

    shojiComment.textContent = miniGameResultText; // SHOJI先生のコメントを更新
    showMessageBox('ミニゲーム結果', miniGameResultText, endDayAfterMiniGame); // 結果表示後、その日の終了処理へ
}

function endDayAfterMiniGame() {
    console.log('--- endDayAfterMiniGame() called --- ミニゲーム後の日の終了処理。');
    // ミニゲームがその日の活動の代わりになるため、直接放課後フェーズへ
    gamePhase = 'after_school_phase';
    hideFallingWordsMiniGame(); // ミニゲームUIを隠す
    shojiComment.textContent = `国際交流活動お疲れ様！今日の経験を次に活かすんだぞ！放課後をどう過ごす？`;
    blackboardWord.textContent = '放課後';
    blackboardWord.classList.remove('blackboard-word-animated');
    blackboardArea.classList.remove('hidden'); // 黒板を再表示
    availableAfterSchoolActions = correctAnswersToday; // ミニゲームのスコアではなく、クイズの正解数でアクション可能回数を設定
    showAfterSchoolActions();
}

// === ゲーム要素を隠す汎用関数 ===
function hideGameElements() {
    console.log('--- hideGameElements() called --- 主要ゲームUIを隠します。');
    answerButtonsContainer.classList.add('hidden');
    startButton.classList.add('hidden');
    afterSchoolActions.classList.add('hidden');
    locationSelectionArea.classList.add('hidden');
    difficultySelection.classList.add('hidden');
    timerArea.classList.add('hidden');
    feedbackMessage.classList.add('hidden');
    blackboardArea.classList.add('hidden'); // 黒板も隠す（ミニゲーム中など）
    clearInterval(timerInterval);
    hideDialogueButtons(); // 会話関連のボタンを隠す
}

// ミニゲームUIを隠すヘルパー関数
function hideFallingWordsMiniGame() {
    console.log('--- hideFallingWordsMiniGame() called --- ミニゲームUIを隠します。');
    miniGameContainer.classList.add('hidden');
    // ミニゲームの描画ループを停止
    if (miniGameInterval) {
        cancelAnimationFrame(miniGameInterval);
    }
    miniGameActive = false; // ゲーム状態を非アクティブに
}


// === ゲーム終了時の処理 ===
function endGame() {
    console.log('--- endGame() called --- ゲーム終了。');
    gamePhase = 'game_over';
    clearInterval(timerInterval);
    hideGameElements(); // 全てのゲーム要素を隠す
    hideFallingWordsMiniGame(); // ミニゲームも隠す

    // BGM停止
    if (bgmLoop) {
        bgmLoop.stop();
    }
    Tone.Destination.volume.value = -Infinity; // BGMを完全にミュート

    displayDialogue(storyEvents.game_end, () => {
        const finalMessage = `学園祭終了！\nあなたの最終スコア: ${score}点\n学力: ${playerStats.academicAbility.toFixed(1)}\n集中力: ${playerStats.concentration.toFixed(1)}\n運: ${playerStats.luck.toFixed(1)}`;
        showMessageBox('ゲーム終了！', finalMessage, showStartMenu); // 結果表示後、スタートメニューへ
    });
}

// === イベントリスナーの追加 ===
// 難易度選択ボタン
difficultyButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        console.log('難易度ボタンがクリックされました:', event.target.dataset.difficulty);
        const difficulty = event.target.dataset.difficulty;
        initializeGame(difficulty);
    });
});

// 放課後アクションボタン
actionStudy.addEventListener('click', () => handleAfterSchoolAction('study'));
actionTalkClassmate.addEventListener('click', () => handleAfterSchoolAction('talk_classmate'));
actionNextDay.addEventListener('click', () => handleAfterSchoolAction('next_day'));

// 場所選択ボタン
locationButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const locationType = event.target.dataset.location;
        handleLocationSelection(locationType);
    });
});

// 会話の「次へ」ボタン
// displayDialogue関数とshowNextDialogueLine関数はdialogueNextButtonのクリックイベントを内部で処理するため、
// ここではデフォルトのリスナーは追加せず、showMessageBox内で動的に管理するように変更しました。
// ただし、showNextDialogueLine関数を直接呼び出す必要があるので、そのためのリスナーは残します。
dialogueNextButton.addEventListener('click', showNextDialogueLine);

// ゲームスタートボタン (「次の問題へ」にも使用)
startButton.addEventListener('click', () => {
    console.log('startButton (ゲームスタート/次の問題へ) がクリックされました。');
    if (gamePhase === 'quiz_phase' && currentQuestionIndex < currentGameDayQuestions.length) {
        displayQuestion();
        startButton.classList.add('hidden'); // 次の問題を表示したらボタンを隠す
    }
});


// === 初期表示 ===
window.onload = function() {
    console.log('window.onload: ページ読み込み完了。');
    setupBGM(); // BGMを初期化
    resizeCanvas(); // キャンバスサイズを初回ロード時に設定
    window.addEventListener('resize', resizeCanvas); // ウィンドウリサイズ時にキャンバスサイズを調整
    showStartMenu(); // ゲームをスタートメニューから開始
};
