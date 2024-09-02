// Internal Imports
// mdx 상단에 넣어줄 컴포넌트들
import DocumentedClass from "../../types/DocumentedClass";
import DocumentParams from "../../types/DocumentParams";

/*
"customTags": [
    {
        tag: 'internal444',
        value: "import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';"
    }
]
*/
export default (classData: DocumentedClass) => {
    return classData.customTags
        ?.filter(tag => tag.tag === 'internal_import')
        .map(tag => tag.value)
        .join("\n") ?? '';
}