# Teamspirit経費申請，交通費半自動化
## overview
- TeamSpirit登録自動化
- LightningはCSPを外す必要があるため自己責任で
### 交通費申請
- 経費精算ページでブックマークレット
- 年月，曜日，乗車駅，降車駅，金額，JOBを指定し，交通費を周期登録する．
- 土日祝日は除いて申請登録します。（土日は選択できるが申請されません）
### 工数登録
- 工数登録ページでブックマークレット
- JOB毎に%で割合を記入する
  - 処理の都合上でなんやかんやしているため複数登録する場合、フォーム入力値と実際に入力する値がズレます。
### 勤怠修正
- 勤怠表画面でブックマークレット
- 勤務開始終了時刻を入力し、実行日までの勤怠を修正する
  - チェックボックスで、月末までまとめて修正も可
  - 土日祝日は非対応
  - 勤怠打刻の時間がランダムで前後します（設定より内側にはこない）

## HOW TO USE

### Lightning
1. Chrome Extension を用いる
1. Chrome で `chrome://extensions` を開く
1. `Developer Mode` を ON にして、`パッケージ化されてない拡張機能を読み込む`を開く
1. `csp-disabler` フォルダを選択
1. 以下 Classic と同様(※2回ブックマークレットを実行する必要がある)
### Classic
* 下記スクリプトをブックマークのURLに入れる.
```
javascript:(function(){
    var a='https://cdn.jsdelivr.net/gh/yt1n4/sf-t-expenses-js@master/input_codes.js';
    var d=document;
    var e=d.createElement('script');
    e.charset='utf-8';e.src=a;
    d.getElementsByTagName('head')[0].appendChild(e);
})();
```
1. salesforce経費申請画面を開き，スクリプトを入れたブックマークを押す.
1. 項目を設定する.
1. 入力ボタンを押す.
1. Happy


