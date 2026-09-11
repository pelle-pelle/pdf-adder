import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from tkinterdnd2 import DND_FILES, TkinterDnD


AD_FILE = Path("ad.pdf")

selected_files = []


def refresh_file_list():
    file_list.delete(0, tk.END)

    for path in selected_files:
        file_list.insert(tk.END, path.name)

    if selected_files:
        count_label.config(
            text=f"{len(selected_files)}件のPDFを選択中"
        )
    else:
        count_label.config(
            text="PDFは選択されていません"
        )


def add_files(paths):
    global selected_files

    for path in paths:
        path = Path(path)

        if path.suffix.lower() != ".pdf":
            continue

        try:
            if path.resolve() == AD_FILE.resolve():
                continue
        except FileNotFoundError:
            pass

        if path not in selected_files:
            selected_files.append(path)

    refresh_file_list()


def select_pdfs():
    file_paths = filedialog.askopenfilenames(
        title="パンフレットPDFを選択",
        filetypes=[("PDFファイル", "*.pdf")]
    )

    if file_paths:
        add_files(file_paths)


def drop_pdfs(event):
    dropped_files = root.tk.splitlist(event.data)
    add_files(dropped_files)


def clear_files():
    global selected_files

    selected_files = []
    refresh_file_list()


def create_pdfs():
    if not selected_files:
        messagebox.showwarning(
            "PDF未選択",
            "パンフレットPDFを選択してください。"
        )
        return

    if not AD_FILE.exists():
        messagebox.showerror(
            "広告PDFが見つかりません",
            "ad.pdf がアプリと同じフォルダにありません。"
        )
        return

    success_count = 0
    error_files = []

    for pamphlet_path in selected_files:

        output_path = pamphlet_path.with_name(
            f"{pamphlet_path.stem}_広告付き.pdf"
        )

        try:
            writer = PdfWriter()

            ad_reader = PdfReader(AD_FILE)
            for page in ad_reader.pages:
                writer.add_page(page)

            pamphlet_reader = PdfReader(pamphlet_path)
            for page in pamphlet_reader.pages:
                writer.add_page(page)

            with open(output_path, "wb") as output_file:
                writer.write(output_file)

            success_count += 1

        except Exception as e:
            error_files.append(
                f"{pamphlet_path.name}\n{e}"
            )

    if error_files:
        messagebox.showwarning(
            "処理完了",
            f"{success_count}件のPDFを作成しました。\n\n"
            f"{len(error_files)}件でエラーが発生しました。\n\n"
            + "\n\n".join(error_files)
        )
    else:
        messagebox.showinfo(
            "作成完了",
            f"{success_count}件の広告付きPDFを作成しました。"
        )


root = TkinterDnD.Tk()

root.title("PDF広告追加ツール")

# 高さを広げる
root.geometry("600x620")

# 必要ならウィンドウサイズ変更も可能にする
root.resizable(True, True)


title_label = tk.Label(
    root,
    text="PDF広告追加ツール",
    font=("Helvetica", 20, "bold")
)
title_label.pack(pady=(20, 8))


description_label = tk.Label(
    root,
    text="PDFをドラッグ＆ドロップするか、ファイルを選択してください"
)
description_label.pack(pady=(0, 8))


drop_frame = tk.Frame(
    root,
    width=520,
    height=110,
    relief="groove",
    borderwidth=2
)
drop_frame.pack(pady=8)

drop_frame.pack_propagate(False)


drop_label = tk.Label(
    drop_frame,
    text="ここにPDFをドラッグ＆ドロップ",
    font=("Helvetica", 15)
)
drop_label.pack(expand=True)


drop_frame.drop_target_register(DND_FILES)
drop_frame.dnd_bind("<<Drop>>", drop_pdfs)

drop_label.drop_target_register(DND_FILES)
drop_label.dnd_bind("<<Drop>>", drop_pdfs)


select_button = tk.Button(
    root,
    text="PDFを選択",
    command=select_pdfs,
    width=20,
    height=2
)
select_button.pack(pady=5)


count_label = tk.Label(
    root,
    text="PDFは選択されていません"
)
count_label.pack(pady=5)


file_list = tk.Listbox(
    root,
    width=70,
    height=8
)
file_list.pack(pady=5)


clear_button = tk.Button(
    root,
    text="選択をクリア",
    command=clear_files,
    width=15
)
clear_button.pack(pady=5)


# 書き出しボタン
create_button = tk.Button(
    root,
    text="広告付きPDFを一括作成",
    command=create_pdfs,
    width=28,
    height=2
)
create_button.pack(pady=(10, 20))


root.mainloop()
