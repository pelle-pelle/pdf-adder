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


// ------------------------------------
// PDF選択
// ------------------------------------

selectButton.addEventListener("click", (event) => {
    event.stopPropagation();
    fileInput.click();
});


dropArea.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);

    // 同じファイルを再度選択できるようにする
    fileInput.value = "";
});


// ------------------------------------
// ドラッグ＆ドロップ
// ------------------------------------

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


// ------------------------------------
// PDF追加
// ------------------------------------

function addFiles(files) {

    const pdfFiles = Array.from(files).filter(
        file =>
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf")
    );

    pdfFiles.forEach(file => {

        // 重複登録を防止
        const duplicate = selectedFiles.some(
            existingFile =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
        );

        if (!duplicate) {
            selectedFiles.push(file);
        }

    });

    updateFileList();
}


// ------------------------------------
// ファイル一覧更新
// ------------------------------------

function updateFileList() {

    fileList.innerHTML = "";

    selectedFiles.forEach(file => {

        const li = document.createElement("li");

        li.textContent = file.name;

        fileList.appendChild(li);
    });


    if (selectedFiles.length > 0) {

        fileSection.classList.remove("hidden");

        fileCount.textContent =
            `${selectedFiles.length}件のPDFを選択中`;

        createButton.disabled = false;

    } else {

        fileSection.classList.add("hidden");

        fileCount.textContent = "";

        createButton.disabled = true;
    }
}


// ------------------------------------
// すべてクリア
// ------------------------------------

clearButton.addEventListener("click", () => {

    selectedFiles = [];

    statusElement.textContent = "";
    statusElement.className = "status";

    updateFileList();
});


// ------------------------------------
// 広告付きPDF作成
// ------------------------------------

createButton.addEventListener("click", async () => {

    if (selectedFiles.length === 0) {
        return;
    }

    createButton.disabled = true;
    createButton.textContent = "PDFを作成中...";

    statusElement.className = "status";
    statusElement.textContent =
        "広告PDFを読み込んでいます...";

    try {

        // 固定の広告PDFを読み込む
        const adResponse = await fetch("./ad.pdf");

        if (!adResponse.ok) {
            throw new Error(
                "ad.pdf を読み込めませんでした。"
            );
        }

        const adBytes =
            await adResponse.arrayBuffer();


        // 選択されたPDFを順番に処理
        for (
            let index = 0;
            index < selectedFiles.length;
            index++
        ) {

            const file = selectedFiles[index];

            statusElement.textContent =
                `${index + 1} / ${selectedFiles.length} 件を処理中：${file.name}`;

            const resultBytes =
                await createPdfWithAd(
                    adBytes,
                    file
                );

            const outputName =
                createOutputFileName(
                    file.name
                );

            const pdfBlob =
                new Blob(
                    [resultBytes],
                    {
                        type: "application/pdf"
                    }
                );

            downloadBlob(
                pdfBlob,
                outputName
            );

            // 次のダウンロードまで少し待つ
            await wait(800);
        }


        statusElement.className =
            "status success";

        statusElement.textContent =
            `${selectedFiles.length}件のPDFを作成しました。`;

    } catch (error) {

        console.error(error);

        statusElement.className =
            "status error";

        statusElement.textContent =
            `エラー：${error.message}`;

    } finally {

        createButton.disabled = false;

        createButton.textContent =
            "広告付きPDFを作成";
    }

});


// ------------------------------------
// 広告PDFを先頭に追加
// ------------------------------------

async function createPdfWithAd(
    adBytes,
    pamphletFile
) {

    const { PDFDocument } = PDFLib;

    const outputPdf =
        await PDFDocument.create();


    // 広告PDF
    const adPdf =
        await PDFDocument.load(
            adBytes.slice(0)
        );

    const adPages =
        await outputPdf.copyPages(
            adPdf,
            adPdf.getPageIndices()
        );

    adPages.forEach(page => {
        outputPdf.addPage(page);
    });


    // パンフレットPDF
    const pamphletBytes =
        await pamphletFile.arrayBuffer();

    const pamphletPdf =
        await PDFDocument.load(
            pamphletBytes
        );

    const pamphletPages =
        await outputPdf.copyPages(
            pamphletPdf,
            pamphletPdf.getPageIndices()
        );

    pamphletPages.forEach(page => {
        outputPdf.addPage(page);
    });


    return await outputPdf.save();
}


// ------------------------------------
// 出力ファイル名
// ------------------------------------

function createOutputFileName(fileName) {

    const lastDot =
        fileName.lastIndexOf(".");

    const baseName =
        lastDot === -1
            ? fileName
            : fileName.substring(
                0,
                lastDot
            );

    return `${baseName}_広告付き.pdf`;
}


// ------------------------------------
// ダウンロード
// ------------------------------------

function downloadBlob(blob, fileName) {

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 3000);
}


// ------------------------------------
// 処理待ち
// ------------------------------------

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

