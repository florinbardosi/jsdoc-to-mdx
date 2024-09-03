/*
 * Copyright (c) 2021 NAVER Corp.
 * egjs projects are licensed under the MIT license
 */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable arrow-body-style */
import DocumentedClass from "./types/DocumentedClass";
import DocumentParams from "./types/DocumentParams";
import Identifier from "./types/Identifier";

export const isStatic = (data: Identifier) => data.scope && data.scope === "static";
export const isReadonly = (data: Identifier) => !!data.readonly;
export const isInternal = (data: Identifier) => data.customTags && data.customTags.some(val => val.tag === "internal");
export const isInherited = (data: Identifier) => !!data.inherited && data.inherits;
export const isAsync = (data: Identifier) => !!data.async;

export const getDescription = (data: { description?: string;[key: string]: any }, docParams: DocumentParams) => {
  const locale = docParams.locale;
  let description = data.description
    ? data[locale]
      ? data[locale] as string
      : data.description
    : "";

  if (description.startsWith('<p>') && description.endsWith('</p>')) {
    description = description.slice(3, -4);
  }
  description = description.replace(/\n/g, "<br />");
  return parseEmbed(description, docParams);
}

export const parseTypescriptName = (name: string) => {
  const matched = /^\$ts:(.+)(?:<file>(?:.+)<\/file>)$/.exec(name);

  if (!matched) return name;

  return matched[1] ?? name;
};
export const parseType = (type: Identifier["type"], { dataMap }: DocumentParams) => {
  const genericRegex = /^(?:(\S+)<)([^<>]+)+(?:>)$/;
  const arrayRegex = /^(\S+)\[\]$/;

  if (!type) return "";

  return type.names
    .map(name => parseTypescriptName(name))
    .map(name => {
      const checkingValues = [name];

      const genericMatches = genericRegex.exec(name);
      if (genericMatches) {
        genericMatches[1] && checkingValues.push(genericMatches[1]);
        genericMatches[2] && checkingValues.push(genericMatches[2]);
      }

      const arrayMatches = arrayRegex.exec(name);
      if (arrayMatches) {
        arrayMatches[1] && checkingValues.push(arrayMatches[1]);
      }

      const checked: { [key: string]: boolean } = {};

      checkingValues.forEach(typeName => {
        typeName.split("|")
          .map(val => val.split("&"))
          .reduce((total, val) => [...total, ...val], [])
          .map(val => val.trim())
          .forEach(val => {
            if (dataMap.has(val) && !checked[val]) {
              checked[val] = true;
              name = name.replace(val, `[${val}](${val.replace(/event:/g, "event-").replace(/\./g, ":")})`);
            }
          });
      });

      return name;
    })
    .join(" | ")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/Array\./g, "Array");
};
export const parseName = (name: string) => {
  const parsed = /(?:\S):(?:\S)[.|#](\S)+/.exec(name);
  return parsed ? (parsed.groups![0] ?? name) : name;
};
export const parseURL = (url: string) => {
  return url;
};
export const parseLink = (text?: string) => {
  // Code from dmd/ddata (https://github.com/jsdoc2md/dmd/blob/master/helpers/ddata.js#L616)
  if (!text) return [];

  const results: Array<{
    original: string;
    caption: string;
    url: string;
  }> = [];
  let matches: RegExpExecArray | null = null;
  const link1 = /{@link\s+([^\s}|]+?)\s*}/g; // {@link someSymbol}
  const link2 = /\[([^\]]+?)\]{@link\s+([^\s}|]+?)\s*}/g; // [caption here]{@link someSymbol}
  const link3 = /{@link\s+([^\s}|]+?)\s*\|([^}]+?)}/g; // {@link someSymbol|caption here}
  const link4 = /{@link\s+([^\s}|]+?)\s+([^}|]+?)}/g; // {@link someSymbol Caption Here}

  while ((matches = link4.exec(text)) !== null) {
    results.push({
      original: matches[0],
      caption: matches[2],
      url: matches[1]
    });
    text = text.replace(matches[0], " ".repeat(matches[0].length));
  }

  while ((matches = link3.exec(text)) !== null) {
    results.push({
      original: matches[0],
      caption: matches[2],
      url: matches[1]
    });
    text = text.replace(matches[0], " ".repeat(matches[0].length));
  }

  while ((matches = link2.exec(text)) !== null) {
    results.push({
      original: matches[0],
      caption: matches[1],
      url: matches[2]
    });
    text = text.replace(matches[0], " ".repeat(matches[0].length));
  }

  while ((matches = link1.exec(text)) !== null) {
    results.push({
      original: matches[0],
      caption: matches[1],
      url: matches[1]
    });
    text = text.replace(matches[0], " ".repeat(matches[0].length));
  }

  results.map(result => {
    if (!result.url.startsWith("http")) {
      result.url = result.url.replace(/event:/g, "event-").replace(/\./g, "#");
    }
    return result;
  });

  return results;
};

// {@embed TypeName}가 텍스트에 포함되어 있으면 해당 타입의 properties를 ShowProperties로 표시
const parseEmbed = (text, docParams) => {
  if (!text)
    return "";
  const embedRegex = /{@embed\s+([^\s}]+?)\s*}/g;
  let embedMatches;
  while ((embedMatches = embedRegex.exec(text)) !== null) {
    const embedType = embedMatches[1];
    const embedData = docParams.dataMap.get(embedType);
    if (embedData) {
      const embedContent = `\n${showProperties(embedData.properties, docParams)}`;
      text = text.replace(embedMatches[0], embedContent);
    }
  }
  return text;
};

export const inlineLink = (text?: string) => {
  if (!text) return "";

  const results = parseLink(text);

  results.forEach(result => {
    text = text!.replace(result.original, `[${result.caption}](${result.url})`);
  });

  return text;
};

// Add locales to object if the object description has locales in it
export const parseLocales = (obj: { description: string }, locale: string) => {
  const localeRegex = new RegExp(`<${locale}>(.+)<\/${locale}>`, "s");
  const result = localeRegex.exec(obj.description);

  if (result) {
    obj.description = obj.description.replace(localeRegex, "").trim();
    obj[locale] = result[1];
  }
};

export const hashLink = (name: string, id: string) => `<a href="#${id}">${name}</a>`;

export const showExtends = (classData: DocumentedClass) => classData.augments && classData.augments.length > 0
  ? ` extends ${classData.augments.map(name => parseTypescriptName(name)).join(", ")}`
  : "";
export const showImplements = (data: Identifier) => data.implements && data.implements.length > 0
  ? ` implements ${data.implements.map(name => parseTypescriptName(name)).join(", ")}`
  : "";

export const showTags = (data: Identifier, docParams: DocumentParams) => `<div${docParams.config.bulma ? ` className="bulma-tags"` : ""}>
${[
    isStatic(data) ? `<span className="${docParams.config.bulma ? "bulma-tag is-info" : "badge badge--info"}">static</span>` : null,
    isReadonly(data) ? `<span className="${docParams.config.bulma ? "bulma-tag is-warning" : "badge badge--warning"}">readonly</span>` : null,
    isInherited(data) ? `<span className="${docParams.config.bulma ? "bulma-tag is-danger" : "badge badge--danger"}">inherited</span>` : null,
    isAsync(data) ? `<span className="${docParams.config.bulma ? "bulma-tag is-success" : "badge badge--success"}">async</span>` : null
  ].filter(val => !!val).map(val => `  ${val}`).join("\n")}
</div>`;

export const showType = (type: Identifier["type"], docParams: DocumentParams) => type
  ? `**Type**: ${parseType(type, docParams)}`
  : "";

export const showDefault = (defaultVal: Identifier["defaultvalue"], docParams: DocumentParams) => defaultVal
  ? `**Default**: ${parseType({ names: [defaultVal] }, docParams)}`
  : "";

export const showReturn = (returns: Identifier["returns"], docParams: DocumentParams) => {
  // => returns && returns.length > 0
  // ? `**Returns**: ${returns.filter(val => !!val.type).map(({ type }) => parseType(type!, docParams))}
  // ${returns.map(val => val.description ? `${inlineLink(getDescription(val, docParams))}` : "").join("\n")}`
  // : "";

  if (!returns || returns.length === 0) return "";

  if (returns.length === 1) {
    const { type, description } = returns[0];
    return `**응답**: ${type ? parseType(type, docParams) : ''}
  ${description ? inlineLink(getDescription({ description }, docParams)) : ''}`;
  }

  const tabs = returns.map((ret, index) => {
    const { type, description } = ret;
    const label = type ? type.names[0] : `응답 ${index + 1}`;
    // ${type ? parseType(type, docParams) : ''}
    const content = `${description ? inlineLink(getDescription({ description }, docParams)) : ''}`;
    return `<TabItem value="return${index}" label="${label}">\n${content}\n</TabItem>`;
  }).join('');

  return `**응답**:
<Tabs>
  ${tabs}
</Tabs>`;
};
export const showEmit = (emits: Identifier["fires"], docParams: DocumentParams) => emits && emits.length > 0
  ? `**Emits**: ${emits.map(emit => parseType({ names: [emit] }, docParams)).join(", ")}`
  : "";

const removeParaTags = (text) => {
  if (text.startsWith('<p>') && text.endsWith('</p>')) {
    return text.slice(3, -4);
  }
  return text;
};

export const showTypePropertyToParameters = (type: Identifier["type"], docParams: DocumentParams, depth: number = 0): string => {
  if (!type || !type.names || type.names.length === 0) return "";

  const typeName = type.names[0];
  const typeData = docParams.dataMap.get(typeName);

  if (!typeData || !typeData.properties || typeData.properties.length === 0) return "";

  const indent = "&nbsp;&nbsp;".repeat(depth);
  const prefix = depth > 0 ? "└ " : "";

  if (typeData.type && typeData.type.names[0] !== "String") {
    return typeData.properties.map(prop => {
      var _a;
      const type = parseType(prop.type, docParams);
      const isOptional = ""; //prop.optional ? "✔️" : "";
      const defaultValue = inlineLink((_a = prop.defaultvalue) === null || _a === void 0 ? void 0 : _a.toString());
      const description = removeParaTags(inlineLink(getDescription(prop, docParams))).replace(/\|/g, '\\|');
      const row = `|${indent}${prefix}${prop.name}|${type}|${isOptional}|${defaultValue}|${description}|`;
      let subProperties = "";
      if (prop.type) {
        subProperties = showTypePropertyToParameters(prop.type, docParams, depth + 1);
      }
      return `${row}${subProperties ? '\n' + subProperties : ''}`;
    }).join("\n");
  }
  return "";
}

export const showParameters = (params: Identifier["params"], docParams: DocumentParams) => params && params.length > 0
  ? `|PARAMETER|TYPE|OPTIONAL|DEFAULT|DESCRIPTION|
|:---|:---:|:---:|:---:|:---|
${params.map(param => {//`|${param.name}|${parseType(param.type, docParams)}|${param.optional ? "✔️" : ""}|${inlineLink(param.defaultvalue?.toString())}|${removeParaTags(inlineLink(getDescription(param, docParams))).replace(/\|/g, '\\|')}|`).join("\n")}`
    //: "";
    const type = parseType(param.type, docParams);
    const isOptional = param.optional ? "✔️" : "";
    const defaultValue = inlineLink(param.defaultvalue?.toString());
    const description = removeParaTags(inlineLink(getDescription(param, docParams))).replace(/\|/g, '\\|');

    let row = `|${param.name}|${type}|${isOptional}|${defaultValue}|${description}|`;
    if (param.type) {
      const subProperties = showTypePropertyToParameters(param.type, docParams, 1);
      if (subProperties) {
        row += `\n${subProperties}`;
      }
    }

    return row;
  }).join("\n")}`
  : "";

export const showProperties = (properties: Identifier["properties"], docParams: DocumentParams) => {
  if (!properties || properties.length === 0) {
    return "";
  }
  const hasDefault = properties.some(property => "defaultvalue" in property);
  const defaultTitle = hasDefault ? "DEFAULT|" : "";
  const defaultLine = hasDefault ? ":---:|" : "";

  return `|PROPERTY|TYPE|${defaultTitle}DESCRIPTION|
|:---|:---:|${defaultLine}:---|
${properties.map(param => {
    const defaultValue = hasDefault ? `${`${param.defaultvalue ?? ""}`.trim()}|` : "";
    const description = removeParaTags(inlineLink(getDescription(param, docParams)));

    let row = `|${param.name}|${parseType(param.type, docParams)}|${defaultValue}${description}|`;

    if (param.type) {
      const subProperties = showTypePropertyToParameters(param.type, docParams, 1);
      if (subProperties) {
        row += `\n${subProperties}`;
      }
    }

    return row;
  }).join("\n")}`;
}

export const showThrows = (throws: Identifier["exceptions"], docParams: DocumentParams) => throws && throws.length > 0
  ? `${throws.map(exception => `**Throws**: ${parseType(exception.type, docParams)}\n${inlineLink(getDescription(exception, docParams))}`).join("\n")}`
  : "";

export const showSee = (see: Identifier["see"], docParams: DocumentParams) => see
  ? `**See**:
${see.map(val => parseType({ names: [getDescription(val, docParams)] }, docParams)).map(link => `- ${inlineLink(link)}`).join("\n")}`
  : "";

export const showExample = (data: Identifier) => data.examples
  ? `\`\`\`javascript
` + data.examples.map(example => example.trim()).map(example => inlineLink(example)).join("\n\n") + `
\`\`\``
  : "";

export const showInternalWarning = (data: Identifier) => isInternal(data) ? `<div className="notification is-warning my-2">⚠️ This ${data.kind} is for <strong>internal</strong> use only.</div>` : "";

export const showFunctionParams = (data: Identifier, docParams: DocumentParams) => {
  if (data.kind !== "function") return "";

  // Remove props inside objects
  const params = (data.params ?? []).filter(param => !param.name.includes("."))

  return `(${params.map(param => `${param.name}: ${parseType(param.type, docParams)}${param.defaultvalue ? ` = ${param.defaultvalue}` : ""}`).join(", ")})`
}
