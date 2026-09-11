const fileInput = document.getElementById("fileInput");
const selectButton = document.getElementById("selectButton");

const dropArea = document.getElementById("dropArea");

const fileSection = document.getElementById("fileSection");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");

const clearButton = document.getElementById("clearButton");
const createButton = document.getElementById("createButton");

const statusElement = document.getElementById("status");

let selectedFiles = [];

// -----------------------------
// ファイル選択
// -----------------------------

selectButton.addEventListener("click", (event) => {
  event.stopPropagation();

  fileInput.click();
});

dropArea.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);

  fileInput.value = "";
});

// -----------------------------
// ドラッグ＆ドロップ
// -----------------------------

dropArea.addEventListener("dragover", (event) => {
  event.preventDefault();

  dropArea.classList.add("drag-over");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("drag-over");
});

dropArea.addEventListener("drop", (event) => {
  event.preventDefault();

  dropArea.classList.remove("drag-over");

  addFiles(event.dataTransfer.files);
});

// -----------------------------
// PDF追加
// -----------------------------

function addFiles(files) {
  const pdfFiles = Array.from(files).filter(
    (file) =>
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf"),
  );

  pdfFiles.forEach((file) => {
    const duplicate = selectedFiles.some(
      (existingFile) =>
        existingFile.name === file.name && existingFile.size === file.size,
    );

    if (!duplicate) {
      selectedFiles.push(file);
    }
  });

  updateFileList();
}

// -----------------------------
// ファイル一覧更新
// -----------------------------

function updateFileList() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file) => {
    const li = document.createElement("li");

    li.textContent = file.name;

    fileList.appendChild(li);
  });

  if (selectedFiles.length > 0) {
    fileSection.classList.remove("hidden");

    fileCount.textContent = `${selectedFiles.length}件のPDFを選択中`;

    createButton.disabled = false;
  } else {
    fileSection.classList.add("hidden");

    createButton.disabled = true;
  }
}

// -----------------------------
// クリア
// -----------------------------

clearButton.addEventListener("click", () => {
  selectedFiles = [];

  statusElement.textContent = "";

  updateFileList();
});

// -----------------------------
// PDF作成
// -----------------------------

createButton.addEventListener("click", async () => {
  if (selectedFiles.length === 0) {
    return;
  }

  createButton.disabled = true;

  createButton.textContent = "PDFを作成中...";

  statusElement.className = "status";

  statusElement.textContent = "広告PDFを読み込んでいます...";

  try {
    // -----------------------------
    // 固定広告PDFを取得
    // -----------------------------

    const adResponse = await fetch("./ad.pdf");

    if (!adResponse.ok) {
      throw new Error("ad.pdf を読み込めませんでした。");
    }

    const adBytes = await adResponse.arrayBuffer();

    const zip = new JSZip();

    // -----------------------------
    // 選択PDFを順番に処理
    // -----------------------------

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];

      statusElement.textContent = `${index + 1} / ${selectedFiles.length} 件を処理中：${file.name}`;

      const resultBytes = await createPdfWithAd(adBytes, file);

      const outputName = createOutputFileName(file.name);

      zip.file(outputName, resultBytes);
    }

    // -----------------------------
    // 1件だけならPDFで保存
    // -----------------------------

    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];

      const resultBytes = await createPdfWithAd(adBytes, file);

      downloadBlob(
        new Blob([resultBytes], {
          type: "application/pdf",
        }),
        createOutputFileName(file.name),
      );

      // -----------------------------
      // 複数ならZIP
      // -----------------------------
    } else {
      statusElement.textContent = "ZIPファイルを作成しています...";

      const zipBlob = await zip.generateAsync({
        type: "blob",
      });

      downloadBlob(zipBlob, "広告付きPDF.zip");
    }

    statusElement.className = "status success";

    statusElement.textContent = `${selectedFiles.length}件のPDFを作成しました。`;
  } catch (error) {
    console.error(error);

    statusElement.className = "status error";

    statusElement.textContent = `エラー：${error.message}`;
  } finally {
    createButton.disabled = false;

    createButton.textContent = "広告付きPDFを作成";
  }
});

// -----------------------------
// 広告PDFを先頭に追加
// -----------------------------

async function createPdfWithAd(adBytes, pamphletFile) {
  const { PDFDocument } = PDFLib;

  // 新しいPDF
  const outputPdf = await PDFDocument.create();

  // 広告PDF
  const adPdf = await PDFDocument.load(adBytes);

  const adPages = await outputPdf.copyPages(adPdf, adPdf.getPageIndices());

  adPages.forEach((page) => {
    outputPdf.addPage(page);
  });

  // パンフレット
  const pamphletBytes = await pamphletFile.arrayBuffer();

  const pamphletPdf = await PDFDocument.load(pamphletBytes);

  const pamphletPages = await outputPdf.copyPages(
    pamphletPdf,
    pamphletPdf.getPageIndices(),
  );

  pamphletPages.forEach((page) => {
    outputPdf.addPage(page);
  });

  return await outputPdf.save();
}

// -----------------------------
// 書き出しファイル名
// -----------------------------

function createOutputFileName(fileName) {
  const lastDot = fileName.lastIndexOf(".");

  const baseName = lastDot === -1 ? fileName : fileName.substring(0, lastDot);

  return `${baseName}_広告付き.pdf`;
}

// -----------------------------
// ダウンロード
// -----------------------------

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = fileName;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}
