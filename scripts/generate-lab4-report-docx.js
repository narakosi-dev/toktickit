import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
} from "docx";

const mdPath = path.join(process.cwd(), "docs/lab-04/report-answers.md");
const outDocx = path.join(
  process.cwd(),
  "docs/lab-04/Lab4_Report_67070505218_Nara_Kosiyaporn.docx"
);

const md = fs.readFileSync(mdPath, "utf8");
const lines = md.split("\n");

const children = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();
  if (!line) {
    children.push(new Paragraph({ spacing: { after: 80 } }));
    continue;
  }
  if (line.startsWith("# ")) {
    children.push(
      new Paragraph({
        text: line.replace("# ", ""),
        heading: HeadingLevel.TITLE,
        spacing: { before: 200, after: 100 },
      })
    );
  } else if (line.startsWith("## ")) {
    children.push(
      new Paragraph({
        text: line.replace("## ", ""),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
      })
    );
  } else if (line.startsWith("### ")) {
    children.push(
      new Paragraph({
        text: line.replace("### ", ""),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    );
  } else if (line.startsWith("#### ")) {
    children.push(
      new Paragraph({
        text: line.replace("#### ", ""),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      })
    );
  } else if (line.startsWith("![")) {
    const match = line.match(
      /!\[(.*?)\]\(\.\.\/\.\.\/artifacts\/lab-04\/screenshots\/(.*?)\)/
    );
    if (match) {
      const imgPath = path.join(
        process.cwd(),
        "artifacts/lab-04/screenshots",
        match[2]
      );
      if (fs.existsSync(imgPath)) {
        try {
          const imgBuffer = fs.readFileSync(imgPath);
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 60 },
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 520, height: 290 },
                }),
              ],
            })
          );
        } catch (e) {
          console.warn("Image error:", e.message);
        }
      }
    }
  } else if (line.startsWith("*Figure") && line.endsWith("*")) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: line.replace(/^\*|\*$/g, ""),
            italics: true,
            size: 18,
            color: "556E60",
          }),
        ],
      })
    );
  } else if (line.startsWith("- ")) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: line.replace(/^- /, ""),
            size: 21,
            font: "Calibri",
          }),
        ],
      })
    );
  } else if (line.startsWith("```")) {
    const codeLines = [];
    i++;
    while (i < lines.length && !lines[i].startsWith("```")) {
      codeLines.push(lines[i]);
      i++;
    }
    for (const cl of codeLines) {
      children.push(
        new Paragraph({
          spacing: { before: 10, after: 10 },
          shading: { type: ShadingType.CLEAR, fill: "F4F6F5" },
          children: [
            new TextRun({
              text: cl,
              font: "Consolas",
              size: 16,
              color: "222222",
            }),
          ],
        })
      );
    }
  } else if (line.startsWith("|") && line.endsWith("|")) {
    const tableLines = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|") &&
      lines[i + 1].trim().endsWith("|")
    ) {
      i++;
      tableLines.push(lines[i].trim());
    }
    const parsedRows = tableLines
      .filter((l) => !l.includes("---"))
      .map((l) => {
        return l
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      });
    if (parsedRows.length > 0) {
      const tableRows = parsedRows.map((row, rowIdx) => {
        return new TableRow({
          children: row.map((cell) => {
            return new TableCell({
              width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
              shading:
                rowIdx === 0
                  ? { type: ShadingType.CLEAR, fill: "006B3C" }
                  : rowIdx % 2 === 0
                  ? { type: ShadingType.CLEAR, fill: "F4FAF6" }
                  : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell.replace(/\*\*/g, ""),
                      bold: rowIdx === 0 || cell.includes("**"),
                      color: rowIdx === 0 ? "FFFFFF" : "1B3A2A",
                      font: "Calibri",
                      size: rowIdx === 0 ? 19 : 18,
                    }),
                  ],
                }),
              ],
            });
          }),
        });
      });
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
      children.push(new Paragraph({ spacing: { after: 100 } }));
    }
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: line,
            font: "Calibri",
            size: 21,
            color: "1B3A2A",
          }),
        ],
      })
    );
  }
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outDocx, buffer);
  console.log("[SUCCESS] Generated docx:", outDocx);
});
