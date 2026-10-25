# カードの絵

`public/cards/<英語名を小文字・空白を _ にしたもの>.webp`（192×192）。カードの名前は文字で出ているので、絵は飾り（`alt=""`）。

## 作り方

- ローカルの ComfyUI（waiIllustrious SDXL v1.70、1024×1024、seed 20261025）で 1 枚ずつ生成
- プロンプト: `pixel art, <題材>, single object, front view, centered, large, fills the frame, plain dark background, no humans`
- ネガティブ: `text, letters, numbers, watermark, signature, username, logo, ui, hud, health bar, inventory, interface, game ui, icon grid, multiple items, collage, isometric, person, human, character, face, frame, border, reflection, stack, lowres, worst quality, low quality, blurry`
- 暗い余白を切り詰めて正方形にし、192px の webp（品質 85）に縮小
- 人物のカード（商人・魔女など）は、その人物を表す道具で描く

## 題材

| カード | 題材 |
|--------|------|
| 銅貨・銀貨・金貨 | 鷲の模様の硬貨 1 枚を、銅・銀・金の色に塗り分け（同じ絵の色違いにして見分けやすくする） |
| 屋敷 | 緑の屋根の小さな石造りの館 |
| 公領 | 緑の屋根と 2 本の塔がある大きな館 |
| 属州 | 塔に緑の旗が立つ大きな城 |
| 呪い | 紫の煙に包まれた髑髏 |
| 地下貯蔵庫 | 鉄の輪を巻いた木の樽 |
| 礼拝堂 | 小さな礼拝堂の建物（鐘を指定したが建物が出たので、それを採用） |
| 堀 | 青い堀に囲まれた石の塔 |
| 先触れ | 赤い旗を下げたラッパ |
| 商人 | 真鍮の天秤 |
| 家臣 | 赤い羽根飾りの騎士の兜 |
| 村 | 赤い屋根と煙突の小さな家 |
| 工房 | のこぎりと金づちを置いた木の作業台 |
| 官僚 | 赤い封蝋の巻物と羽ペン |
| 庭園 | 鉢植えの木 |
| 民兵 | 槍と木の盾 |
| 金貸し | 金貨の詰まった革袋 |
| 密猟者 | 狩りの弓と矢筒 |
| 改築 | 積んだ煉瓦とこて |
| 鍛冶屋 | 金づちを載せた鉄床 |
| 玉座の間 | 赤いクッションの金の玉座 |
| 山賊 | 反りのある短剣 |
| 議事堂 | 椅子を並べた木の円卓 |
| 祝祭 | 泡のあふれるジョッキ |
| 研究所 | 青く光る液体のフラスコ |
| 書庫 | 積み上げた古い本 |
| 市場 | 果物と野菜のかご |
| 鉱山 | 岩に刺さったつるはし |
| 歩哨 | 真鍮の望遠鏡 |
| 魔女 | 緑の薬が煮える黒い大釜 |
| 職人 | ろくろに載った陶器の壺 |
