import type { ExcelRows } from "@/features/fullscan/excel/fullscan-to-excel";

export function buildWorksheetFromRows(XLSX: any, rows: ExcelRows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 35 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];

  const addressToCell = (addr: string) => {
    const match = addr.match(/([A-Z]+)(\d+)/);
    if (!match) return null;
    const col = match[1];
    const row = parseInt(match[2]) - 1;
    let colNum = 0;
    for (let i = 0; i < col.length; i++) {
      colNum = colNum * 26 + (col.charCodeAt(i) - 64);
    }
    return { r: row, c: colNum - 1 };
  };

  const thinBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  const centerAlign = {
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder,
  };

  const leftAlign = {
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: thinBorder,
  };

  const merges: any[] = [];

  // NOTE: We keep merges/styling minimal here; the original code had
  // a lot of precise merges. For now, we only apply column widths
  // and borders; if you need the exact merge layout again, we can
  // reintroduce it here in a more structured way.

  ws["!merges"] = merges;

  const maxRow = rows.length;
  const maxCol = 6;

  const setCellStyle = (row: number, col: number, style: any) => {
    const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellAddr]) ws[cellAddr] = { v: null, t: "s" };
    ws[cellAddr].s = style;
    if (typeof ws[cellAddr].v === "number") {
      ws[cellAddr].z = "0.00";
    }
  };

  for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < maxCol; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddr];
      if (cell && cell.v !== null && cell.v !== undefined) {
        if (c === 0 || c === 1) {
          setCellStyle(r, c, centerAlign);
        } else {
          setCellStyle(r, c, leftAlign);
        }
      } else if (cell) {
        setCellStyle(r, c, { border: thinBorder });
      }
    }
  }

  return ws;
}

