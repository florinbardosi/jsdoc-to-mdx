/*
 * Copyright (c) 2021 NAVER Corp.
 * egjs projects are licensed under the MIT license
 */
import DocumentParams from "../../types/DocumentParams";
import Identifier from "../../types/Identifier";
import { getDescription, inlineLink, showDefault, showEmit, showExample, showInternalWarning, showParameters, showProperties, showReturn, showSee, showTags, showThrows, showType } from "../../utils";

const EntityTitle = (data, params, foldTitle = false) => {
    if (data.kind === "function") {
        const functionName = data.name;
        const functionParams = data.params ? data.params.map(param => param.name).join(', ') : '';
        const returnType = data.returns && data.returns.length > 0
            ? data.returns[0].type.names.join(' \\| ').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : 'void';

        const functionSignature = `${functionName}( ${functionParams} ) → ${returnType}`;

        return `${foldTitle ? "" : `### ${functionSignature} {#${data.name}}`}`;
    } else {
        return `${foldTitle ? "" : `### ${data.name} {#${data.kind === "event" ? `event-${data.name}` : data.name}}`}`;
    }
};

export default (data: Identifier, params: DocumentParams, foldTitle = false) => `${EntityTitle(data, params, foldTitle)}

${showTags(data, params)}

${inlineLink(getDescription(data, params))}

${showType(data.type, params)}

${showDefault(data.defaultvalue, params)}

${showEmit(data.fires, params)}

${showParameters(data.params, params)}

${showProperties(data.properties, params)}

${showReturn(data.returns, params)}

${showThrows(data.exceptions, params)}
${showSee(data.see, params)}

${showExample(data)}
`;
