/** @license https://github.com/uewtwo */

LIGHTNING_BASE_URI = '--teamspirit.visualforce.com'

function zeroPadding (num, length) {
  return ('0000000000' + num).slice(-length)
}

function sleep (msec) {
  const dt1 = new Date().getTime()
  var dt2 = new Date().getTime()
  while (dt2 < dt1 + msec) {
    dt2 = new Date().getTime()
  }
  return
}

async function sleepAsync (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTargetDate (tarDayWeek, tarDate) {
  const _isTargetDate =
    JapaneseHolidays.isHoliday(tarDate) == undefined &&
    tarDayWeek.indexOf(tarDate.getDay()) != -1
  return _isTargetDate
}

/** 交通費自動申請 */
function inputTransportExpenses (
  tarYearVal,
  tarMonthVal,
  tarDayVal,
  tarDayWeek,
  expItemVal,
  startStVal,
  endStVal,
  changeStVal,
  aroundFlg,
  jobVal,
  jobTextVal
) {
  // 月の日数
  var daysInMonth =
    (new Date(tarYearVal, tarMonthVal, 0) -
      new Date(tarYearVal, tarMonthVal - 1, 1)) /
      86400000 +
    1
  // 日付を進めるために使用
  var days_counter = tarDayVal
  // ループ回数の上限
  const loop_max_count = 500
  // ループカウンター
  var loop_counter = 0
  // 駅たん前と後で処理を分ける
  var ekitan_searching = false
  // 経由地入力で通信処理を待つ
  var change_searching = false

  var timerid = setInterval(function () {
    var tarDate = new Date(tarYearVal, tarMonthVal - 1, days_counter)
    // finished conditions
    if (days_counter == daysInMonth + 1 || loop_counter == loop_max_count) {
      clearInterval(timerid)
      console.log('daysCounter: ' + days_counter)
      console.log('loopCounter: ' + loop_counter)
    } else if (isTargetDate(tarDayWeek, tarDate)) {
      // 対象日と判定
      console.log(tarDate.getDate() + '...processing')

      if (!ekitan_searching && !change_searching) {
        //  経費申請画面ON
        document.getElementsByClassName('png-add')[1].click()

        //  利用日
        var tarDateVal =
          tarYearVal +
          '/' +
          zeroPadding(tarMonthVal, 2) +
          '/' +
          zeroPadding(days_counter, 2)
        var tarDateEl = document.getElementById('DlgDetailDate')
        tarDateEl.value = tarDateVal

        //  費目
        var expItemEl = document.getElementById('DlgDetailExpItem')
        expItemEl.value = expItemVal

        //  経路開始駅
        var startStEl = document.getElementById('DlgExpDetailStFrom')
        startStEl.value = startStVal

        //  経路終了駅
        var endStEl = document.getElementById('DlgExpDetailStTo')
        endStEl.value = endStVal

        //  往復フラグ
        if (aroundFlg) {
          document
            .getElementsByClassName(
              'pp_base ts-form-roundtrip pp_btn_oneway'
            )[0]
            .click()
        }

        //  ジョブ
        var jobEl = document.getElementById('DlgDetailJob')
        jobEl.value = jobVal
        var jobTextEl = document
          .getElementsByClassName('ts-row-job')[0]
          .getElementsByTagName('input')[0]
        jobTextEl.value = jobTextVal

        // 駅探で探す
        document.getElementsByClassName('pp_base pp_btn_ektsrch')[0].click()
        ekitan_searching = true
      } else if (ekitan_searching && !change_searching) {
        // 駅たん表示画面用の条件
        // 経由地入力をする場合、再度通信が走るため処理フローを分ける
        if (
          !changeStVal &&
          document.getElementsByClassName('station').length != 0
        ) {
          console.log('############ 駅探画面 ###############')
          // 駅探処理が終わりなのでステータスを戻す
          ekitan_searching = false
          days_counter++
          document.getElementById('expSearchOk').click()
          document.getElementsByClassName('ts-dialog-ok')[0].click()
        } else if (
          !!changeStVal &&
          document.getElementsByClassName('station').length != 0
        ) {
          console.log('############ 駅探画面 ###############')
          // 経由地検索し駅探処理継続
          change_searching = true
          document.getElementById('expSearchResultRoute').value = changeStVal
          document.getElementById('expSearchResultSearch').click()
        }
      } else if (
        change_searching &&
        document.getElementById('dijit_Dialog_0').style.display == 'none'
      ) {
        change_searching = false
        ekitan_searching = false
        days_counter++
        document.getElementById('expSearchOk').click()
        document.getElementsByClassName('ts-dialog-ok')[0].click()
      }
    } else {
      console.log(tarDate.getDate() + '...skip')
      days_counter++
    }

    loop_counter++
  }, 500)
}

// コロン区切りの時間に揺らぎを持たせる
// 0時とかは考慮しない
// type = "begin" or "end"
function convertRandomFactor (tar_time, type) {
  var rand = Math.floor(Math.random() * 20)
  var hour = Number(tar_time.split(':')[0])
  var minu = Number(tar_time.split(':')[1])

  if (type == 'begin') {
    if (minu < rand) {
      hour -= 1
      minu += 60
    }
    minu = minu - rand
  } else if (type == 'end') {
    if (60 < minu + rand) {
      hour += 1
      minu -= 60
    }
    minu = minu + rand
  } else {
    throw Error(`Undefined type ${type}. You can use "begin" or "end".`)
  }

  return `${hour}:${zeroPadding(minu, 2)}`
}

/** 工数登録自動 */
function inputWorkloadPerformance (job_clock_map) {
  // entering workload condition
  clockon_re = /^\d{1,2}:\d{2}$/
  // 割合の登録通信後用だが、状態を管理しないため使用しない
  clockrate_re = /^\d{1,3}%$/

  // 日付を進めるために使用
  var days_counter = 0
  // ループ回数の上限
  const loop_max_count = 500
  // ループカウンター
  var loop_counter = 0
  // 非同期通信を待つためのフラグ
  var wl_entering = false
  // 初回のdays_counter進める
  var _day_borders = document.getElementsByClassName('day_border')
  var _written_day_borders = Array.from(_day_borders).filter(function (item) {
    return (
      item.getElementsByClassName('png-add').length != 0 &&
      !!item.getElementsByClassName('time')[0].innerText.match(clockrate_re)
    )
  })
  days_counter += _written_day_borders.length

  var timerid = setInterval(function () {
    // 工数入力確定に使用する要素、%のありなしで判定
    var day_borders = document.getElementsByClassName('day_border')
    var active_day_borders = Array.from(day_borders).filter(function (item) {
      return item.getElementsByClassName('png-add').length != 0
    })

    if (
      days_counter == active_day_borders.length ||
      loop_counter == loop_max_count
    ) {
      clearInterval(timerid)
      console.log('Finished')
      console.log('daysCounter: ' + days_counter)
      console.log('loopCounter: ' + loop_counter)
    } else if (
      (active_day_borders[days_counter].getElementsByClassName('time')[0]
        .innerText != '' &&
        active_day_borders[days_counter].getElementsByClassName('time')[0]
          .innerText != Object.values(job_clock_map)[0]) ||
      !!active_day_borders[days_counter]
        .getElementsByClassName('time')[0]
        .innerText.match(clockrate_re)
    ) {
      // job_clock_map の初期値に一致しない値、もしくは %表示ならスルーしてdays_counter進める
      days_counter++
      loop_counter++
      wl_entering = false
    } else if (
      !wl_entering &&
      active_day_borders[days_counter].getElementsByClassName('time')[0]
        .innerText == ''
    ) {
      // 工数登録画面on
      active_day_borders[days_counter]
        .getElementsByClassName('png-add')[0]
        .click()
      // クロック入力を行う
      Object.keys(job_clock_map).forEach(key => {
        if (
          !document
            .getElementById('empWorkLock' + key)
            .className.includes('pb_btn_clockon')
        ) {
          // クロック入力on
          document.getElementById('empWorkLock' + key).click()
        }
        // 値入力
        document.getElementById('empInputTime' + key).value = job_clock_map[key]
      })
      document.getElementById('empWorkOk').click()
      wl_entering = true
    } else if (
      !wl_entering &&
      !!active_day_borders[days_counter].getElementsByClassName('time')[0]
        .innerText != Object.values(job_clock_map)[0]
    ) {
      // 工数登録画面on
      active_day_borders[days_counter]
        .getElementsByClassName('png-add')[0]
        .click()
      // 割合に戻す
      Object.keys(job_clock_map).forEach(key => {
        if (
          document
            .getElementById('empWorkLock' + key)
            .className.includes('pb_btn_clockon')
        ) {
          // クロック入力off
          document.getElementById('empWorkLock' + key).click()
        }
      })

      document.getElementById('empWorkOk').click()
      wl_entering = true
    } else if (wl_entering) {
      // 通信完了を確認
      // ':'を含む時間が登録されていたらdays_counterを進めず、'%'を含む時間が登録されていたらdays_counterを進める、
      if (
        !!active_day_borders[days_counter]
          .getElementsByClassName('time')[0]
          .innerText.match(clockon_re)
      ) {
        wl_entering = false
      } else if (
        !!active_day_borders[days_counter]
          .getElementsByClassName('time')[0]
          .innerText.match(clockrate_re)
      ) {
        days_counter++
        wl_entering = false
      }
      // 前回が通信中ステータスで工数に値が何もない状態は想定していない
    }
    loop_counter++
  }, 700)
}

/** 勤怠打刻修正 */
async function inputAttendanceFix (isLightning, begin_time, end_time, until_latest) {
  const targetElements = document.getElementsByClassName('dval vst day_time0')
  const targetDays = targetElements.length
  for (i = 0; i < targetDays; i++) {
    const targetDay = targetElements[i]
    // 申請がデフォルトでなければ入力はスキップ（申請欄のHTMLタイトルを見て判定）
    const applyId = targetDay.id.replace('TimeSt', 'Apply')
    if (document.getElementById(applyId).title !== '勤怠関連申請') {
      continue
    }
    targetDay.click()
    const registerTime = async function (begin, end) {
      const startTime = document.getElementById('startTime')
      // 何か入っていなければ入れる
      if (startTime.value === '') {
        startTime.value = begin_time
      }
      const endTime = document.getElementById('endTime')
      if (endTime.value === '') {
        endTime.value = end_time
      }
      document.getElementById('dlgInpTimeOk').click()
    }

    await registerTime(begin_time, end_time)

    // 登録完了の通信を10秒待つ、少数扱いたくないのでカウンターが10なら5秒
    var waitTime = 0
    while(waitTime < 20) {
      ++waitTime
      if (targetDay.innerText !== '') {
        await sleepAsync(100)
        break
      }
      await sleepAsync(500)
    }
  }
}


/** 勤怠打刻修正 */
function _inputAttendanceFix (isLightning, begin_time, end_time, until_latest) {
  // ループ回数の上限
  const loop_max_count = 500
  // ループカウンター
  var loop_counter = 0
  // 非同期通信を待つためのフラグ
  var ad_entering = false
  // 初回のみ勤怠修正画面ONに通信が走るので確認
  var is_first = true
  // 実行日以前の休日を除くpng-addの数を数える
  var no_entries = function () {
    const tar_week = [1, 2, 3, 4, 5]
    const today = new Date()
    return Array.from(document.getElementsByClassName('png-add')).filter(
      function (item) {
        var tar_date_str = item.parentElement.id
        const tar_date = new Date(tar_date_str.slice(8))
        const day_times = item.parentElement.parentElement.getElementsByClassName(
          'dval day_time0'
        )
        if (until_latest) {
          // 最新日付までを修正する
          return (
            (item.parentElement.parentElement.className.includes('days odd') ||
              item.parentElement.parentElement.className.includes(
                'days even'
              )) && // even or odd が所定労働日
            item.parentElement.className.includes('dval vapply') &&
            isTargetDate(tar_week, tar_date) &&
            (day_times[0].innerText == '' || day_times[1].innerText == '') &&
            tar_date <= today
          )
        } else {
          return (
            (item.parentElement.parentElement.className.includes('days odd') ||
              item.parentElement.parentElement.className.includes(
                'days even'
              )) && // even or odd が所定労働日
            item.parentElement.className.includes('dval vapply') &&
            isTargetDate(tar_week, tar_date) &&
            (day_times[0].innerText == '' || day_times[1].innerText == '')
          )
        }
      }
    )
  }
  // 処理前のpng-addの数を保持し、処理後と比較する
  var pre_no_entries = no_entries()

  var timerid = setInterval(function () {
    if (no_entries().length == 0 || loop_counter == loop_max_count) {
      // ループ上限か、png-addが0だった場合終了
      clearInterval(timerid)
      console.log('Finished')
      console.log('loopCounter: ' + loop_counter)
    } else if (is_first && !ad_entering) {
      console.log('first editing')
      // 初回は通信走らせるためにクリックだけする
      pre_no_entries[0].click()
      ad_entering = true
    } else if (
      is_first &&
      ad_entering &&
      !!document.getElementById('applyNew_reviseTime')
    ) {
      // 初回通信完了
      document.getElementsByClassName('std-button2')[5].click()
      is_first = false
      ad_entering = false
    } else if (!is_first && !ad_entering) {
      pre_no_entries = no_entries()
      // 勤怠修正画面ON
      pre_no_entries[0].click()
      sleep(200)
      // 打刻修正画面
      document.getElementById('applyNew_reviseTime').click()
      // 値入力
      if (
        !document.getElementsByClassName('inputime roundBegin inputab')[0].value
      ) {
        document.getElementsByClassName(
          'inputime roundBegin inputab'
        )[0].value = convertRandomFactor(begin_time, 'begin')
      }
      if (
        !document.getElementsByClassName('inputime roundEnd inputab')[0].value
      ) {
        document.getElementsByClassName(
          'inputime roundEnd inputab'
        )[0].value = convertRandomFactor(end_time, 'end')
      }

      document.getElementById('empApplyDone1').click()
      ad_entering = true
    } else if (
      !is_first &&
      ad_entering &&
      no_entries().length != pre_no_entries.length
    ) {
      // 通信完了
      ad_entering = false
      pre_no_entries = no_entries()
    } else {
      console.log('...skip')
      console.log('ad_entering: ' + ad_entering)
      console.log('no_entries: ' + pre_no_entries.length)
      console.log('LoopCounter: ' + loop_counter)
    }

    loop_counter++
  }, 700)
}

function appendScript (srcPar) {
  sc = document.createElement('script')
  sc.type = 'text/javascript'
  sc.src = srcPar
  document.head.appendChild(sc)
}

function appendCss (srcPar) {
  link = document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('type', 'text/css')
  link.setAttribute('href', srcPar)
  document.head.appendChild(link)
}

function setupLib () {
  // jquery
  src = 'https://code.jquery.com/jquery-latest.min.js'
  appendScript(src)
  // jpholiday
  src =
    'https://cdn.rawgit.com/osamutake/japanese-holidays-js/v1.0.9/lib/japanese-holidays.min.js'
  appendScript(src)

  // // weekline
  // css = 'http://codebits.weebly.com/uploads/2/5/9/3/25939244/jquery.weekline-white.css'
  // appendCss(css)
  // css = 'http://codebits.weebly.com/uploads/2/5/9/3/25939244/cleanslate.css'
  // appendCss(css)
  // src = "http://codebits.weebly.com/uploads/2/5/9/3/25939244/jquery.weekline.js"
  // appendScript(src)
}

/** 交通費自動申請 */
function createTransportDSForm (isLightning) {
  var year = new Date().getFullYear()
  var month = new Date().getMonth() + 1
  var day = new Date().getDay() + 1

  if (isLightning) {
    document
      .getElementById('expTopView')
      .insertAdjacentHTML(
        'beforebegin',
        '<div style="background-color:#66CCFF" class="DSTeamAutomation"><h1>交通費設定</h1><p><form name="sfDSAutoForm"><label for="sfDSYear">年: </label><input id="sfDSYear" type="number" value=' +
          year +
          '><label for="sfDSMonth">月: </label><input id="sfDSMonth" type="number" value=' +
          month +
          '><label for="sfDSDay">日: </label><input id="sfDSDay" type="number" value=' +
          day +
          '><p><label for="sfDSWeekline">曜日: </label><span id="weekCal"></span><label for="sfDSWeekline0"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline0" value=0>日 </label><label for="sfDSWeekline1"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline1" value=1 checked="checked">月 </label><label for="sfDSWeekline2"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline2" value=2 checked="checked">火 </label><label for="sfDSWeekline3"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline3" value=3 checked="checked">水 </label><label for="sfDSWeekline4"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline4" value=4 checked="checked">木 </label><label for="sfDSWeekline5"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline5" value=5>金 </label><label for="sfDSWeekline0"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline6" value=6>土 <label></p><label for="sfDSFromSt">乗車駅: </label><input id="sfDSFromSt" type="text" placeholder="東根室駅"><label for="sfDSToSt">降車駅: </label><input id="sfDSToSt" type="text" placeholder="那覇空港駅"><label for="sfDSChangeSt">経由駅: </label><input id="sfDSChangeSt" type="text" placeholder="名古屋駅"></input><p><label for="sfDSJob">JOB: </label><select id="sfDSJob"></select></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  } else {
    document
      .getElementById('AppBodyHeader')
      .insertAdjacentHTML(
        'beforebegin',
        '<div class="DSTeamAutomation"><h1>交通費設定</h1><p><form name="sfDSAutoForm"><label for="sfDSYear">年: </label><input id="sfDSYear" type="number" value=' +
          year +
          '><label for="sfDSMonth">月: </label><input id="sfDSMonth" type="number" value=' +
          month +
          '><p><label for="sfDSWeekline">曜日: </label><span id="weekCal"></span><label for="sfDSWeekline0"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline0" value=0>日 </label><label for="sfDSWeekline1"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline1" value=1 checked="checked">月 </label><label for="sfDSWeekline2"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline2" value=2 checked="checked">火 </label><label for="sfDSWeekline3"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline3" value=3 checked="checked">水 </label><label for="sfDSWeekline4"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline4" value=4 checked="checked">木 </label><label for="sfDSWeekline5"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline5" value=5>金 </label><label for="sfDSWeekline0"><input type="checkbox" name="sfDSWeekline" id="sfDSWeekline6" value=6>土 <label></p><label for="sfDSFromSt">乗車駅: </label><input id="sfDSFromSt" type="text" placeholder="東根室駅"><label for="sfDSToSt">降車駅: </label><input id="sfDSToSt" type="text" placeholder="那覇空港駅"><label for="sfDSChangeSt">経由駅: </label><input id="sfDSChangeSt" type="text" placeholder="名古屋駅"></input><p><label for="sfDSJob">JOB: </label><select id="sfDSJob"></select></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  }

  // JOB プルダウンリストを取得/生成
  document.getElementsByClassName('png-add')[1].click()
  var jobList = document.getElementById('DlgDetailJob').options
  document.getElementsByClassName('ts-dialog-cancel')[0].click()

  for (var i = 0; i < jobList.length; i++) {
    var op = document.createElement('option')
    op.value = jobList[i].value //value値
    // 最初のスペースの後ろから切り取り
    jobText = jobList[i].text
    op.text = jobText.substr(jobText.indexOf(' ')) //テキスト値
    document.getElementById('sfDSJob').appendChild(op)
  }
}

/** 交通費自動申請 */
function execTransport (isLightning) {
  // 入力フォームを出す
  createTransportDSForm(isLightning)
  // 送信ボタンListner
  document.sfDSAutoForm.sfDSAutoButton.addEventListener('click', function () {
    const tarYearVal = document.getElementById('sfDSYear').value
    if (tarYearVal == '') {
      alert('Undefinded target year.')
      return
    }
    const tarMonthVal = document.getElementById('sfDSMonth').value
    if (tarMonthVal == '') {
      alert('Undefined target month.')
      return
    }
    const tarDayVal = document.getElementById('sfDSDay').value
    if (tarDayVal == '') {
      alert('Undefined target day.')
      return
    }

    const tarDayWeek = []
    const tarDayWeekEl = document.getElementsByName('sfDSWeekline')
    for (var i = 0; i < tarDayWeekEl.length; i++) {
      if (tarDayWeekEl[i].checked) {
        tarDayWeek.push(Number(tarDayWeekEl[i].value))
      }
    }

    // 経費のどの項目か
    const expItemVal = 'a1l2j000000PCYmAAO'
    const startStVal = document.getElementById('sfDSFromSt').value
    if (startStVal == '') {
      alert('Undefined starting station.')
      return
    }
    const endStVal = document.getElementById('sfDSToSt').value
    if (endStVal == '') {
      alert('Undefined end station.')
      return
    }
    const changeStVal = document.getElementById('sfDSChangeSt').value
    const aroundFlg = true

    // JOB
    const jobEl = document.getElementById('sfDSJob')
    const jobIdx = jobEl.selectedIndex
    const jobVal = jobEl.options[jobIdx].value
    if (jobVal == '') {
      alert('Undefined job.')
      return
    }
    const jobTextVal = jobEl.options[jobIdx].text

    inputTransportExpenses(
      tarYearVal,
      tarMonthVal,
      tarDayVal,
      tarDayWeek,
      expItemVal,
      startStVal,
      endStVal,
      changeStVal,
      aroundFlg,
      jobVal,
      jobTextVal
    )
  })
}

/** 工数自動登録 */
function createWorkloadDSForm (isLightning) {
  if (isLightning) {
    document
      .getElementById('expTopView')
      .insertAdjacentHTML(
        'beforebegin',
        '<div style="background-color:#66CCFF" class="DSTeamAutomation"><h1>工数実績設定</h1><p>適当な値でなんやかんやと計算をしているのでピッタリにならない<p>月の途中でJOBが変わるパターンは未想定（そのうち）<p><form name="sfDSAutoForm"><div class="DSJobList"></div></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  } else {
    document
      .getElementById('AppBodyHeader')
      .insertAdjacentHTML(
        'beforebegin',
        '<div class="DSTeamAutomation"><h1>工数実績設定</h1><p>適当な値でなんやかんやと計算をしているのでピッタリにならない<p>月の途中でJOBが変わるパターンは未想定（そのうち）<p><form name="sfDSAutoForm"><div class="DSJobList"></div></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  }
  // JOBリストを取得してその数だけフォーマットを用意
  // 入力済みのJOB以降を取得
  var day_borders = document.getElementsByClassName('day_border')
  Array.from(day_borders)
    .filter(function (item) {
      return (
        item.getElementsByClassName('png-add').length != 0 &&
        item.getElementsByClassName('time')[0].innerText == ''
      )
    })[0]
    .getElementsByClassName('png-add')[0]
    .click()

  rowList = document.getElementById('empWorkTableBody').rows
  if (rowList.length == 0) {
    alert('アサイン済みジョブを設定してください')
    exit
  }
  for (var i = 0; i < rowList.length; i++) {
    const jobRowValues = rowList[i].children[0].innerText.split('\t')
    document
      .getElementsByClassName('DSJobList')[0]
      .insertAdjacentHTML(
        'beforeend',
        '<p><label for="sfDSJob">' +
          jobRowValues[1] +
          ': <input id="' +
          jobRowValues[0] +
          '_' +
          'sfDSJob" type="number" value=0></input>' +
          '%' +
          '</label></p>'
      )
  }
  document.getElementById('empWorkCancel').click()

  return rowList.length
}

/** 工数自動登録 */
function execWorkload (isLightning) {
  // Form作成、job数受け取り
  var jobsLength = createWorkloadDSForm(isLightning)
  // 送信ボタンListner
  document.sfDSAutoForm.sfDSAutoButton.addEventListener('click', function () {
    console.log('Workload Click Event Fire.')
    // {key-number: rate, ...} で渡す
    var job_rate_map = {}
    for (var j = 1; j < jobsLength + 1; j++) {
      if (document.getElementById(j + '_sfDSJob').value != 0) {
        job_rate_map[j] = document.getElementById(j + '_sfDSJob').value
      }
    }
    // %の割合を適当な YY:mm に変換する
    var per_sum = function (arr) {
      var per_sum = 0
      arr.forEach(function (val) {
        per_sum += Number(val)
      })
      return per_sum
    }
    const denominator = per_sum(Object.values(job_rate_map))

    var job_clock_map = {}
    Object.keys(job_rate_map).forEach(function (key, index) {
      var hours = Number(job_rate_map[key]) * (24 / denominator)
      var hour = Math.floor(hours)
      var minu = Math.round((hours - hour) * 60)
      var hours_str = hour + ':' + zeroPadding(minu, 2)

      // 元のマップに書き戻す
      // 要素取得（TS側）は0始まりなので、1ずらす
      job_clock_map[Number(key) - 1] = hours_str
    })

    if (Object.keys(job_clock_map).length == 0) {
      alert('ジョブ毎の工数を最低1つ記載してください')
      return
    }
    console.log(job_clock_map)
    inputWorkloadPerformance(job_clock_map)
  })
}LIGHTNING_BASE_URI

/** 勤怠打刻修正 */
function createAttendanceDSForm (isLightning) {
  if (isLightning) {
    document
      .getElementById('expTopView')
      .insertAdjacentHTML(
        'beforebegin',
        '<div style="background-color:#66CCFF" class="DSTeamAutomation"><h1>勤務時間設定(例: 9:00, 18:00)</h1><p>当日日付までの承認済み/承認待ちでない日の勤怠打刻修正を、値のない箇所のみ修正します。</p><br><p>ランダムで20分まで前後します。</p><form name="sfDSAutoForm"><div class="DSAttendancBegin"><label for="DSAttendanceBeginTime">勤務開始時間: <input id="DSAttendanceBeginTime" type="text" value="10:00"></input></label></div><div class="DSAttendancEnd"><label for="DSAttendanceEndTime">勤務終了時間: <input id="DSAttendanceEndTime" type="text" value="19:00"></input></label></div><div><lavel for="DSUntileLatestCheck">今日分までの修正<input id="DSUntileLatestCheck" type="checkbox" checked="checked"></input></lavel></div></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  } else {
    document
      .getElementById('AppBodyHeader')
      .insertAdjacentHTML(
        'beforebegin',
        '<div class="DSTeamAutomation"><h1>勤務時間設定(例: 9:00, 18:00)</h1><p>当日日付までの承認済み/承認待ちでない日の勤怠打刻修正を、値のない箇所のみ修正します。</p><br><p>ランダムで20分まで前後します。</p><form name="sfDSAutoForm"><div class="DSAttendancBegin"><label for="DSAttendanceBeginTime">勤務開始時間: <input id="DSAttendanceBeginTime" type="text" value="10:00"></input></label></div><div class="DSAttendancEnd"><label for="DSAttendanceEndTime">勤務終了時間: <input id="DSAttendanceEndTime" type="text" value="19:00"></input></label></div><div><lavel for="DSUntileLatestCheck">今日分までの修正<input id="DSUntileLatestCheck" type="checkbox" checked="checked"></input></lavel></div></p><p><button name="sfDSAutoButton" type="button">入力</button></p></form></div>'
      )
  }
  return true
}

/** 勤怠打刻修正 */
function execAttendance (isLightning) {
  // Form作成
  createAttendanceDSForm(isLightning)
  // 送信ボタンListner
  document.sfDSAutoForm.sfDSAutoButton.addEventListener('click', function () {
    console.log('Attendance Click Event Fire.')
    // HH:mm check (コロン区切りの時間表記かチェック)
    begin_time = document.getElementById('DSAttendanceBeginTime').value
    end_time = document.getElementById('DSAttendanceEndTime').value
    attend_re = /^\d{1,2}:\d{2}$/
    if (!begin_time.match(attend_re) || !end_time.match(attend_re)) {
      alert('12:00 みたいな表記で入力してください。')
      return false
    }
    var until_latest = document.getElementById('DSUntileLatestCheck').checked

    inputAttendanceFix(isLightning, begin_time, end_time, until_latest)
  })
}

;(function () {
  // jquery, weekline, css　とかの読み込み
  setupLib()

  // 今いるURLで処理を分ける
  const url = location.href
  // lightningかclassicか判定
  const isLightning =
    location.href.includes('lightning') ||
    location.href.includes('visualforce.com')
  const isTransition = location.href.includes('visualforce.com')
  // TODO: iframe読み込み
  // Ajax? クロスドメインでのjs読み込みが制限されているので回避する方法を検討 csp
  // if (isLightning) {
  //     alert("Lightningバージョンへは現在未対応です。")
  //     return
  // }

  var app_id = ''
  if (isLightning && !isTransition) {
    app_id = url.slice(url.lastIndexOf('__') + 2)
  } else if (isLightning && isTransition) {
    app_id = url.slice(url.lastIndexOf('apex/') + 5)
  } else if (!isLightning) {
    app_id = url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('?'))
  }

  // 社名を隠すためにURLから引っ張る
  const PREFIX = location.href.slice(
    location.href.indexOf('/') + 2,
    location.href.indexOf('.')
  )

  switch (app_id) {
    // workload
    // lightning
    case 'AtkEmpJobTab':
      alert(
        '専用ページ(iframe)に遷移します。\nページが更新されたら再度ブックマークレットを実行してください。'
      )
      location.href =
        'https://' + PREFIX + LIGHTNING_BASE_URI + '/apex/AtkEmpJobView'
      return
    // classic
    case 'AtkEmpJobView':
      execWorkload(isLightning)
      return
    // transport
    // lightning
    case 'AtkEmpExpTab':
      alert(
        '専用ページ(iframe)に遷移します。\nページが更新されたら再度ブックマークレットを実行してください。'
      )
      location.href =
        'https://' + PREFIX + LIGHTNING_BASE_URI + '/apex/AtkEmpExpView'
      return
    // classic
    case 'AtkEmpExpView':
      execTransport(isLightning)
      break
    // attendance
    // lightning
    case 'AtkWorkTimeTab':
      alert(
        '専用ページ(iframe)に遷移します。\nページが更新されたら再度ブックマークレットを実行してください。'
      )
      location.href =
        'https://' + PREFIX + LIGHTNING_BASE_URI + '/apex/AtkWorkTimeView'
      return
    // classic
    case 'AtkWorkTimeView':
      execAttendance(isLightning)
      return
  }
})()
