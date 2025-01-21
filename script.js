let state = {
  jsonData: null,
  xAxis: "",
  leftYAxis: [],
  rightYAxis: [],
  chart: null,
};

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelector("#fileInput");
  const displayButton = document.querySelector("#displayButton");
  const resetZoomButton = document.querySelector("#resetZoomButton");
  const copyButton = document.querySelector("#copyButton");
  const applyRangeButton = document.querySelector("#applyRangeButton");

  fileInput.addEventListener("change", handleChangeFileInput);
  displayButton.addEventListener("click", handleClickDisplayButton);
  resetZoomButton.addEventListener("click", handleClickResetZoomButton);
  copyButton.addEventListener("click", handleClickCopyButton);
  applyRangeButton.addEventListener("click", handleClickApplyRangeButton);
});

function handleChangeFileInput(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];

  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["xlsx", "xls"].includes(extension)) {
    alert("Excelファイルを選択してください。");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  const buttonDiv = document.querySelector("#buttonDiv");
  const resetZoomButton = document.querySelector("#resetZoomButton");
  const copyButton = document.querySelector("#copyButton");
  const rangeDiv = document.querySelector("#rangeDiv");

  reader.addEventListener("load", handleLoadFileReader);
  reader.readAsArrayBuffer(file);
  buttonDiv.classList.remove("hidden");
  displayButton.textContent = "グラフを表示";
  resetZoomButton.disabled = true;
  copyButton.disabled = true;
  rangeDiv.classList.add("hidden");
}

function handleLoadFileReader(event) {
  const fileInput = event.target;
  const jsonData = readExcelFile(fileInput);
  const names = Object.keys(jsonData[0]);
  const nameDiv = document.querySelector("#nameDiv");

  nameDiv.innerHTML = "";
  resetState();
  renderSettingTable(names);
  state.jsonData = jsonData;
}

function handleClickDisplayButton(event) {
  const displayButton = event.target;
  const resetZoomButton = document.querySelector("#resetZoomButton");
  const copyButton = document.querySelector("#copyButton");
  const selectedRadio = document.querySelector('input[name="XAxis"]:checked');
  const checkedBoxes = {
    leftYAxis: document.querySelectorAll('input[name="leftYAxis"]:checked'),
    rightYAxis: document.querySelectorAll('input[name="rightYAxis"]:checked'),
  };
  const rangeDiv = document.querySelector("#rangeDiv");

  state.xAxis = selectedRadio.value;
  state.leftYAxis = Array.from(checkedBoxes.leftYAxis).map((box) => box.value);
  state.rightYAxis = Array.from(checkedBoxes.rightYAxis).map(
    (box) => box.value
  );
  createChart();
  displayButton.textContent = "グラフを更新";
  resetZoomButton.disabled = false;
  copyButton.disabled = false;
  rangeDiv.classList.remove("hidden");
  setInitialDateRange(state.jsonData);
}

function handleClickResetZoomButton() {
  state.chart.resetZoom();
}

function handleClickCopyButton() {
  const canvas = document.querySelector("#chartCanvas");

  canvas.toBlob((blob) => {
    const item = new ClipboardItem({ "image/png": blob });

    window.navigator.clipboard.write([item]).then(
      () => {
        alert("クリップボードにコピーしました");
      },
      (error) => {
        console.error("コピーに失敗しました:", error);
        alert("コピーに失敗しました");
      }
    );
  });
}

function handleClickApplyRangeButton() {
  const startDateInput = document.querySelector("#startDateInput");
  const endDateInput = document.querySelector("#endDateInput");

  if (!startDateInput.value || !endDateInput.value) {
    alert("開始日時と終了日時が入力されていません");
    return;
  }

  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);

  if (startDate > endDate) {
    alert("開始日時が終了日時より後ろです");
    return;
  }

  const filteredJsonData = state.jsonData.filter((item) => {
    const itemDate = new Date(item[state.xAxis]);
    return itemDate >= startDate && itemDate <= endDate;
  });

  if (filteredJsonData.length === 0) {
    alert("指定された範囲にデータが存在しません");
    return;
  }
  console.log(startDate);
  console.log(endDate);
  console.log(filteredJsonData);

  updateChart(filteredJsonData);
}

function readExcelFile(inputElem) {
  const data = new Uint8Array(inputElem.result);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet);
}

function renderSettingTable(names) {
  const nameDiv = document.querySelector("#nameDiv");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headerRow = document.createElement("tr");

  for (const name of ["名称", "X軸", "左Y軸", "右Y軸"]) {
    const th = document.createElement("th");
    th.textContent = name;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  for (const [index, name] of names.entries()) {
    const tr = document.createElement("tr");

    for (let i = 0; i < 4; i++) {
      const td = document.createElement("td");

      if (i === 0) {
        td.textContent = name;
      } else {
        const input = document.createElement("input");

        if (i === 1) {
          input.type = "radio";
          input.name = "XAxis";
          input.value = name;
          input.checked = index === 0 ? true : false;
        } else {
          input.type = "checkbox";
          input.name = `${i === 2 ? "left" : "right"}YAxis`;
          input.value = name;
        }

        input.className = "cursor-pointer";
        td.appendChild(input);
        td.className = "align-center";
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  table.className = "setting-table";
  nameDiv.appendChild(table);
}

function renderChart(jsonData) {
  const datasets = [];
  const scales = {};
  let count = 0;

  if (state.leftYAxis.length !== 0) {
    for (const name of state.leftYAxis) {
      const dataset = {
        label: name,
        data: jsonData.map((item) => item[name]),
        borderColor: colors[count].borderColor,
        backgroundColor: colors[count].backgroundColor,
        yAxisID: "leftY",
      };

      datasets.push(dataset);
      count++;
    }

    scales.leftY = { type: "linear", position: "left" };
  }

  if (state.rightYAxis.length !== 0) {
    for (const name of state.rightYAxis) {
      const dataset = {
        label: name,
        data: jsonData.map((item) => item[name]),
        borderColor: colors[count].borderColor,
        backgroundColor: colors[count].backgroundColor,
        yAxisID: "rightY",
      };

      datasets.push(dataset);
      count++;
    }

    scales.rightY = {
      type: "linear",
      position: "right",
      grid: {
        drawOnChartArea: false,
      },
    };
  }

  const context = document.querySelector("#chartCanvas").getContext("2d");
  const labels = jsonData.map((item) =>
    getDateTimeString(new Date(item[state.xAxis]))
  );

  const config = {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      scales,
      plugins: {
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
        },
      },
    },
  };

  if (state.chart) {
    state.chart.destroy();
  }

  state.chart = new Chart(context, config);
}

function createChart() {
  renderChart(state.jsonData);
}

function updateChart(filteredJsonData) {
  renderChart(filteredJsonData);
}

function setInitialDateRange(jsonData) {
  const xAxisData = jsonData.map((item) => new Date(item[state.xAxis]));
  const minDate = new Date(Math.min(...xAxisData));
  const maxDate = new Date(Math.max(...xAxisData));
  const startDateInput = document.querySelector("#startDateInput");
  const endDateInput = document.querySelector("#endDateInput");

  startDateInput.value = getDateTimeString(minDate, true);
  endDateInput.value = getDateTimeString(maxDate, true);
}

function getDateTimeString(date, iso8601 = false) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return iso8601
    ? `${year}-${month}-${day}T${hours}:${minutes}`
    : `${year}/${month}/${day} ${hours}:${minutes}`;
}

function resetState() {
  state.jsonData = null;
  state.xAxis = "";
  state.leftYAxis = [];
  state.rightYAxis = [];

  if (state.chart) {
    state.chart.destroy();
  }
}
