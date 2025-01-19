let state = {
  jsonData: null,
  xAxis: "",
  leftYAxis: [],
  rightYAxis: [],
  chart: null,
};

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelector("#fileInput");
  fileInput.addEventListener("change", handleChangeFileInput);
});

function handleChangeFileInput(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["xlsx", "xls"].includes(extension)) {
    alert("Excelファイルを選択してください。");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", handleLoadFileReader);
  reader.readAsArrayBuffer(file);
}

function handleLoadFileReader(event) {
  const fileInput = event.target;
  const jsonData = readExcelFile(fileInput);
  const names = Object.keys(jsonData[0]);
  const nameDiv = document.querySelector("#nameDiv");

  nameDiv.innerHTML = "";
  state = {
    jsonData: null,
    xAxis: "",
    leftYAxis: [],
    rightYAxis: [],
    chart: null,
  };
  renderSettingTable(names);
  renderDisplayButton();
  state.jsonData = jsonData;
}

function handleClickDisplayButton(event) {
  const selectedRadio = document.querySelector('input[name="XAxis"]:checked');
  const checkedBoxes = {
    leftYAxis: document.querySelectorAll('input[name="leftYAxis"]:checked'),
    rightYAxis: document.querySelectorAll('input[name="rightYAxis"]:checked'),
  };

  state.xAxis = selectedRadio.value;
  state.leftYAxis = Array.from(checkedBoxes.leftYAxis).map((box) => box.value);
  state.rightYAxis = Array.from(checkedBoxes.rightYAxis).map(
    (box) => box.value
  );
  createChart();
  event.target.textContent = "グラフを更新 / ズームをリセット";
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

function renderDisplayButton() {
  const nameDiv = document.querySelector("#nameDiv");
  const button = document.createElement("button");

  button.id = "displayButton";
  button.className = "button margin-top cursor-pointer";
  button.textContent = "グラフを表示";
  button.addEventListener("click", handleClickDisplayButton);
  nameDiv.appendChild(button);
}

function createChart() {
  const labels = state.jsonData.map((item) =>
    getDateTimeString(new Date(item[state.xAxis]))
  );
  const datasets = [];
  const ctx = document.querySelector("#chartCanvas").getContext("2d");
  let count = 0;

  for (const name of state.leftYAxis) {
    const dataset = {
      label: name,
      data: state.jsonData.map((item) => item[name]),
      borderColor: colors[count].borderColor,
      backgroundColor: colors[count].backgroundColor,
      yAxisID: "leftY",
    };

    datasets.push(dataset);
    count++;
  }

  for (const name of state.rightYAxis) {
    const dataset = {
      label: name,
      data: state.jsonData.map((item) => item[name]),
      borderColor: colors[count].borderColor,
      backgroundColor: colors[count].backgroundColor,
      yAxisID: "rightY",
    };

    datasets.push(dataset);
    count++;
  }

  if (state.chart) {
    state.chart.destroy();
  }

  Chart.register(ChartZoom);
  state.chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: {
        leftY: {
          type: "linear",
          position: "left",
        },
        rightY: {
          type: "linear",
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
        },
      },
    },
  });
}

function getDateTimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}
