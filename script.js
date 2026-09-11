createButton.addEventListener("click", async () => {
  if (selectedFiles.length === 0) {
    return;
  }

  createButton.disabled = true;
  createButton.textContent = "PDFを作成中...";

  statusElement.className = "status";
  statusElement.textContent = "広告PDFを読み込んでいます...";

  try {
    // 固定広告PDFを取得
    const adResponse = await fetch("./ad.pdf");

    if (!adResponse.ok) {
      throw new Error("ad.pdf を読み込めませんでした。");
    }

    const adBytes = await adResponse.arrayBuffer();

    // ---------------------------------
    // 1件だけの場合
    // ---------------------------------
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];

      statusElement.textContent = `1 / 1 件を処理中：${file.name}`;

      // ここで1回だけPDFを作成
      const resultBytes = await createPdfWithAd(adBytes, file);

      downloadBlob(
        new Blob([resultBytes], {
          type: "application/pdf",
        }),
        createOutputFileName(file.name),
      );

      // ---------------------------------
      // 複数の場合
      // ---------------------------------
    } else {
      const zip = new JSZip();

      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];

        statusElement.textContent = `${index + 1} / ${selectedFiles.length} 件を処理中：${file.name}`;

        const resultBytes = await createPdfWithAd(adBytes, file);

        const outputName = createOutputFileName(file.name);

        zip.file(outputName, resultBytes);
      }

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
