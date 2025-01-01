
```mermaid
graph TB
    A[创建组件实例] --> B[beforeCreate钩子]
    B --> C[初始化数据/注入]
    C --> D[created钩子]
    D --> E[是否指定template]
    E -->|是| F[编译template为render函数]
    E -->|否| G[使用render函数]
    F --> H[beforeMount钩子]
    G --> H
    H --> I[创建虚拟DOM]
    I --> J[挂载DOM]
    J --> K[mounted钩子]
    K --> L[数据更新]
    L --> M[beforeUpdate钩子]
    M --> N[重新渲染虚拟DOM]
    N --> O[更新DOM]
    O --> P[updated钩子]
    P --> L
    K --> Q[组件卸载]
    Q --> R[beforeUnmount钩子]
    R --> S[卸载组件]
    S --> T[unmounted钩子]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
    style K fill:#bbf,stroke:#333,stroke-width:2px
    style M fill:#bbf,stroke:#333,stroke-width:2px
    style P fill:#bbf,stroke:#333,stroke-width:2px
    style R fill:#bbf,stroke:#333,stroke-width:2px
    style T fill:#bbf,stroke:#333,stroke-width:2px

```

```
**描述说明**：
- 节点 `A` 表示用户请求访问受保护的应用程序。
- 节点 `B` 表示应用程序准备好 SAML 请求并将用户重定向到 Azure AD 进行身份验证。
- 节点 `C` 是 Azure AD，它显示登录页面并生成 SAML 响应。
- 节点 `F` 表示应用程序接收 SAML 响应并进行验证。
- 最后，节点 `H` 表示用户成功登录应用程序。

你可以直接将这个 Mermaid 代码粘贴到支持 Mermaid 的工具中（例如 Markdown 编辑器、一些 Wiki 平台等）来生成流程图。如果有任何部分需要调整或者进一步详细说明，随时告诉我！

```