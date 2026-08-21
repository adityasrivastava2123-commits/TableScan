declare module "@langchain/core/tools" {
  export const tool: any;
}

declare module "@langchain/groq" {
  export const ChatGroq: any;
}

declare module "@langchain/core/messages" {
  export const SystemMessage: any;
  export const HumanMessage: any;
  export const AIMessage: any;
  export const ToolMessage: any;
}
