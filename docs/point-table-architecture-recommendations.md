# 点表架构优化建议

  适用范围：

  - ChannelConfiguration
      - PointTablePoints.vue
      - PointTableMappings.vue                                                                                                                                                                                          
      - PointsTablesDialog.vue                                                                                                                                                                                          
  - DeviceConfiguration                                                                                                                                                                                                 
      - DevicePointTablePoints.vue                                                                                                                                                                                      
      - DevicePointTableRouting.vue                                                                                                                                                                                     
      - PointsTablesDialog.vue                                                                                                                                                                                          
                                                                                                                                                                                                                        
  目标：面向“协议类型越来越多、字段/校验规则差异越来越大”的长期可扩展性。                                                                                                                                               
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 1) 当前痛点（从代码观察）                                                                                                                                                                                          
                                                                                                                                                                                                                        
  - 协议/点位类型分支逻辑分散在：                                                                                                                                                                                       
      - 表头渲染                                                                                                                                                                                                        
      - 编辑控件                                                                                                                                                                                                        
      - CSV 导入/导出                                                                                                                                                                                                   
      - 校验逻辑
      - 过滤逻辑                                                                                                                                                                                                        
  - Channel 和 Device 两套表格逻辑高度重复：                                                                                                                                                                            
      - 过滤逻辑                                                                                                                                                                                                        
      - 行状态跟踪
      - 行内编辑流程                                                                                                                                                                                                    
      - CSV 解析                                                                                                                                                                                                        
  - 校验规则直接写在组件中，新增协议需要改多处。                                                                                                                                                                        
  - Routing 表格逻辑和 UI 逻辑混杂，难维护。                                                                                                                                                                            
  - CSV 表头严格硬编码，改字段必须同步多处。                                                                                                                                                                            
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 2) 推荐架构：协议/点位类型驱动的 Schema                                                                                                                                                                            
                                                                                                                                                                                                                        
  ### 2.1 Protocol Schema 模型                                                                                                                                                                                          
                                                                                                                                                                                                                        
  用一份 Schema 定义驱动：                                                                                                                                                                                              
                                                                                                                                                                                                                        
  - 哪些列显示                                                                                                                                                                                                          
  - 编辑控件类型                                                                                                                                                                                                        
  - CSV 导入/导出字段                                                                                                                                                                                                   
  - 校验规则                                                                                                                                                                                                            
                                                                                                                                                                                                                        
  建议结构：                                                                                                                                                                                                            
                                                                                                                                                                                                                        
  export type FieldEditor = 'input' | 'number' | 'select' | 'boolean' | 'readonly';                                                                                                                                     
                                                                                                                                                                                                                        
  export interface FieldDef {                                                                                                                                                                                           
    key: string;              // 数据字段                                                                                                                                                                               
    label: string;                                                                                                                                                                                                      
    editor: FieldEditor;                                                                                                                                                                                                
    required?: boolean;                                                                                                                                                                                                 
    visible?: (ctx) => boolean;                                                                                                                                                                                         
    options?: (ctx) => Array<{label:string; value:any}>;                                                                                                                                                                
    validator?: (value, row, ctx) => string | null;                                                                                                                                                                     
    csv?: { header: string; parser?: (v: string) => any; serializer?: (v: any) => string };                                                                                                                             
  }                                                                                                                                                                                                                     
                                                                                                                                                                                                                        
  export interface ProtocolSchema {                                                                                                                                                                                     
    protocol: 'modbus_tcp' | 'modbus_rtu' | 'di_do' | 'virt' | 'can' | string;                                                                                                                                          
    points: Record<'T'|'S'|'C'|'A', FieldDef[]>;                                                                                                                                                                        
    mappings: Record<'T'|'S'|'C'|'A', FieldDef[]>;                                                                                                                                                                      
  }                                                                                                                                                                                                                     
                                                                                                                                                                                                                        
  新增协议时只需要新增 Schema。                                                                                                                                                                                         
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 3) 校验规则抽出为“规则集合”                                                                                                                                                                                        
                                                                                                                                                                                                                        
  把所有校验逻辑抽出，放到独立文件：                                                                                                                                                                                    
                                                                                                                                                                                                                        
  src/validators/protocols/modbus.ts                                                                                                                                                                                    
  src/validators/protocols/di_do.ts                                                                                                                                                                                     
  src/validators/device/routing.ts                                                                                                                                                                                      
                                                                                                                                                                                                                        
  组件只调用：                                                                                                                                                                                                          
                                                                                                                                                                                                                        
  const error = schemaField.validator?.(value, row, ctx)                                                                                                                                                                
                                                                                                                                                                                                                        
  优点：                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  - 规则集中管理                                                                                                                                                                                                        
  - 导入导出校验复用                                                                                                                                                                                                    
  - 易于单元测试
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 4) CSV 导入/导出统一抽象                                                                                                                                                                                           
                                                                                                                                                                                                                        
  将 CSV 操作统一封装成 schema 驱动：                                                                                                                                                                                   
                                                                                                                                                                                                                        
  src/utils/csvSchema.ts                                                                                                                                                                                                
                                                                                                                                                                                                                        
  API 例如：                                                                                                                                                                                                            
                                                                                                                                                                                                                        
  export function parseCsv<T>(schema: FieldDef[], csv: string): T[]                                                                                                                                                     
  export function exportCsv(schema: FieldDef[], rows: T[]): string                                                                                                                                                      
                                                                                                                                                                                                                        
  好处：                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  - CSV 格式与 schema 同步                                                                                                                                                                                              
  - 新协议只补 schema                                                                                                                                                                                                   
  - 移除散落的 header 字符串                                                                                                                                                                                            
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 5) 抽取公共 Composable                                                                                                                                                                                             
                                                                                                                                                                                                                        
  ### 5.1 usePointTableBase                                                                                                                                                                                             
                                                                                                                                                                                                                        
  负责：                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  - rowKey 生成                                                                                                                                                                                                         
  - 行内编辑生命周期                                                                                                                                                                                                    
  - rowStatus 管理（added/modified/deleted）                                                                                                                                                                            
  - 过滤逻辑                                                                                                                                                                                                            
  - fieldErrors 维护                                                                                                                                                                                                    
                                                                                                                                                                                                                        
  ### 5.2 useCsvImportExport                                                                                                                                                                                            
                                                                                                                                                                                                                        
  负责：                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  - 文件导入                                                                                                                                                                                                            
  - schema 驱动解析                                                                                                                                                                                                     
  - 应用导入结果                                                                                                                                                                                                        
  - schema 驱动导出                                                                                                                                                                                                     
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 6) UI 渲染改成字段配置驱动                                                                                                                                                                                         
                                                                                                                                                                                                                        
  通过 schema 渲染列，而不是手写大模板：                                                                                                                                                                                

  <div v-for="field in fields" :key="field.key" class="vtable__cell">                                                                                                                                                   
    <Editor :field="field" :row="row" :editing="row.isEditing" />                                                                                                                                                       
  </div>                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  优势：                                                                                                                                                                                                                
                                                                                                                                                                                                                        
  - 模板缩小 60%+                                                                                                                                                                                                       
  - 新字段自动显示                                                                                                                                                                                                      
  - 错误显示统一
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 7) Routing 表格数据流建议                                                                                                                                                                                          
                                                                                                                                                                                                                        
  当前 routing 同时包含 UI + 异步查询 + 校验。建议拆分：
                                                                                                                                                                                                                        
  - 通道点缓存逻辑单独抽到 service                                                                                                                                                                                      
  - 校验只做“本地结构规则”                                                                                                                                                                                              
  - 异步校验（点位是否存在）独立处理                                                                                                                                                                                    
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 8) 低风险分阶段改造路径                                                                                                                                                                                            
                                                                                                                                                                                                                        
  Phase 1（最小成本）                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  - 只引入 schema                                                                                                                                                                                                       
  - CSV header 用 schema                                                                                                                                                                                                
  - 校验抽出为 validator                                                                                                                                                                                                
                                                                                                                                                                                                                        
  Phase 2                                                                                                                                                                                                               
                                                                                                                                                                                                                        
  - 抽出公共 composable                                                                                                                                                                                                 
                                                                                                                                                                                                                        
  Phase 3                                                                                                                                                                                                               
                                                                                                                                                                                                                        
  - 全面 schema 驱动渲染                                                                                                                                                                                                
                                                                                                                                                                                                                        
  ———                                                                                                                                                                                                                   
                                                                                                                                                                                                                        
  ## 9) 建议文件结构                                                                                                                                                                                                    
                                                                                                                                                                                                                        
  src/                                                                                                                                                                                                                  
    schemas/                                                                                                                                                                                                            
      channelProtocols.ts                                                                                                                                                                                               
    validators/
      protocols/
    composables/
      usePointTableBase.ts
      useCsvImportExport.ts
    utils/
      csvSchema.ts

  ———

  ## 10) 预期收益

  - 新协议无需修改模板
  - 校验规则统一且可测试
  - 逻辑复用，减少重复代码
  - 更容易维护和扩展

  ———
