import "server-only";

type DocxChapter = {
  index: number;
  title: string | null;
  content: string;
};

type DocxWork = {
  title: string;
  synopsis: string;
  workType: string;
  chapters: DocxChapter[];
};

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textRuns(text: string) {
  if (!text) return "";
  const chunks = text.match(/[\s\S]{1,8000}/g) ?? [text];
  return chunks
    .map((chunk) => `<w:r><w:t xml:space="preserve">${escapeXml(chunk)}</w:t></w:r>`)
    .join("");
}

function paragraph(text: string, style?: string, options: { pageBreakBefore?: boolean } = {}) {
  const pPr = [
    style ? `<w:pStyle w:val="${style}"/>` : "",
    options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
  ].filter(Boolean).join("");
  const pPrXml = pPr ? `<w:pPr>${pPr}</w:pPr>` : "";
  return `<w:p>${pPrXml}${textRuns(text)}</w:p>`;
}

function chapterHeading(workType: string, index: number, title: string | null) {
  const prefix = workType === "short_story" ? `场景 ${index}` : `第 ${index} 章`;
  return `${prefix} ${title || ""}`.trim();
}

function buildDocumentXml(work: DocxWork) {
  const body = [
    paragraph(work.title, "Title"),
    work.synopsis ? paragraph(work.synopsis) : "",
    ...work.chapters.flatMap((chapter, chapterOffset) => [
      paragraph(chapterHeading(work.workType, chapter.index, chapter.title), "Heading1", {
        pageBreakBefore: chapterOffset > 0 || Boolean(work.title.trim() || work.synopsis.trim()),
      }),
      ...contentParagraphs(chapter.content),
    ]),
  ]
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function contentParagraphs(content: string) {
  const paragraphs: string[] = [];
  let blankCount = 0;

  for (const rawLine of content.split(/\r?\n/g)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      blankCount += 1;
      if (blankCount <= 3) paragraphs.push(paragraph("", "BlankLine"));
      continue;
    }

    blankCount = 0;
    paragraphs.push(paragraph(line));
  }

  return paragraphs.length ? paragraphs : [paragraph("", "BlankLine")];
}

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:cs="SimSun"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="420" w:lineRule="auto"/>
        <w:ind w:firstLine="480" w:firstLineChars="200"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="120" w:line="420" w:lineRule="auto"/>
      <w:ind w:firstLine="480" w:firstLineChars="200"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:cs="SimSun"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="240" w:after="360" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="0" w:firstLineChars="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:cs="SimSun"/>
      <w:b/>
      <w:sz w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BlankLine">
    <w:name w:val="Blank Line"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="80" w:line="240" w:lineRule="auto"/>
      <w:ind w:firstLine="0" w:firstLineChars="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:cs="SimSun"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:jc w:val="center"/>
      <w:spacing w:before="240" w:after="240" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="0" w:firstLineChars="0"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:cs="SimSun"/>
      <w:b/>
      <w:sz w:val="30"/>
    </w:rPr>
  </w:style>
</w:styles>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="420"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
  <w:compat/>
</w:settings>`;

const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="宋体">
    <w:altName w:val="SimSun"/>
    <w:charset w:val="86"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="SimSun">
    <w:altName w:val="宋体"/>
    <w:charset w:val="86"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>`;

function buildCorePropertiesXml(work: DocxWork, date = new Date()) {
  const iso = date.toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(work.title)}</dc:title>
  <dc:creator>Autofanqian</dc:creator>
  <cp:lastModifiedBy>Autofanqian</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropertiesXml(work: DocxWork) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Autofanqian</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Autofanqian</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
  <TitlesOfParts>
    <vt:vector size="${Math.max(1, work.chapters.length)}" baseType="lpstr">
      ${work.chapters.map((chapter) => `<vt:lpstr>${escapeXml(chapterHeading(work.workType, chapter.index, chapter.title))}</vt:lpstr>`).join("")}
    </vt:vector>
  </TitlesOfParts>
</Properties>`;
}

function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, dosDate };
}

function zipStore(files: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { time, dosDate } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

export function buildDocxBuffer(work: DocxWork) {
  return zipStore([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: relsXml },
    { name: "docProps/core.xml", content: buildCorePropertiesXml(work) },
    { name: "docProps/app.xml", content: buildAppPropertiesXml(work) },
    { name: "word/_rels/document.xml.rels", content: documentRelsXml },
    { name: "word/styles.xml", content: stylesXml },
    { name: "word/settings.xml", content: settingsXml },
    { name: "word/fontTable.xml", content: fontTableXml },
    { name: "word/document.xml", content: buildDocumentXml(work) },
  ]);
}
