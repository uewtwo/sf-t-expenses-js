async function enterAttendance() {
  var attendances = []
  var workdayRows = document.querySelectorAll(
    "table.attendance-table-contents > tbody > tr.v3.attendance-table-row-error"
  )
  workdayRows.forEach((row) => {
    attendances.push(
      Array.from(row.querySelectorAll(".column-attendance-record"))
        .slice(0, 2)
        .map((r) => r.querySelector("input[type=text]"))
    )
  })

  attendances.slice(0, 2).forEach((attendance) => {
    attendance[0].value = "10:00"
    attendance[0].dispatchEvent(new Event("change", { bubbles: true }))
  })
  await new Promise((waiter) => setTimeout(waiter, 50))
  attendances.slice(0, 2).forEach((attendance) => {
    attendance[1].value = "19:00"
    attendance[1].dispatchEvent(new Event("change", { bubbles: true }))
  })
}

enterAttendance()
