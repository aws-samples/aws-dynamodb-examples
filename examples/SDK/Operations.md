## DynamoDB Operations covered in this samples

| Operation                                           | Java | .NET | Node.js | Python | Rust | Go  |
| --------------------------------------------------- | :--: | :--: | :-----: | :----: | :--: | :-: |
| BatchGet                                            |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| BatchWrite                                          |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| DeleteItem                                          |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| DeleteItemConditional                               |  ❌  |  ✅  |   ✅    |   ✅   |  ❌  | ✅  |
| GetItem                                             |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| PutItem                                             |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| PutItemConditional                                  |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| TransactGet                                         |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| TransactWrite                                       |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| UpdateItem                                          |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| UpdateItemConditional                               |  ✅  |  ✅  |   ✅    |   ✅   |  ✅  | ✅  |
| PartiQL SimpleSelectStatement                       |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ❌  |
| PartiQL ExecuteStatement                            |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ❌  |
| PartiQL ExecuteTransaction                          |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ❌  |
| PartiQL BatchExecuteStatement                       |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ❌  |
| Create Index                                        |  ❌  |  ❌  |   ❌    |   ❌   |  ✅  | ❌  |
| Update Index Provisioned Capacity                   |  ❌  |  ❌  |   ✅    |   ❌   |  ❌  | ❌  |
| Delete Index                                        |  ❌  |  ❌  |   ✅    |   ❌   |  ✅  | ❌  |
| Query Index                                         |  ✅  |  ❌  |   ❌    |   ❌   |  ✅  | ❌  |
| Scan with pagination                                |  ✅  |  ❌  |   ✅    |   ❌   |  ✅  | ❌  |
| Scan in parallel                                    |  ✅  |  ❌  |   ✅    |   ❌   |  ✅  | ❌  |
| Read from stream                                    |  ❌  |  ❌  |   ✅    |   ❌   |  ❌  | ❌  |
| Add Global Table Region                             |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| Add Provisioned Capacity                            |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| CreateGlobalTable                                   |  ❌  |  ❌  |   ✅    |   ❌   |  ❌  | ✅  |
| CreateTable On-Demand                               |  ❌  |  ❌  |   ✅    |   ✅   |  ✅  | ✅  |
| CreateTable Provisioned                             |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| Delete Global Table Region                          |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| DeleteTable                                         |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| DescribeGlobalTable and DescribeGlobalTableSettings |  ❌  |  ❌  |   ✅    |   ❌   |  ❌  | ✅  |
| DescribeLimits                                      |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| DescribeTable                                       |  ❌  |  ❌  |   ✅    |   ✅   |  ✅  | ✅  |
| Disable Autoscaling                                 |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| Enable Autoscaling                                  |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| Update Autoscaling                                  |  ❌  |  ❌  |   ❌    |   ❌   |  ❌  | ✅  |
| Disable Streams                                     |  ❌  |  ❌  |   ✅    |   ❌   |  ✅  | ✅  |
| Enable Streams                                      |  ❌  |  ❌  |   ✅    |   ✅   |  ✅  | ✅  |
| ListTables                                          |  ❌  |  ❌  |   ✅    |   ✅   |  ✅  | ✅  |
| UpdateGlobalTable and UpdateGlobalTableSettings     |  ❌  |  ❌  |   ✅    |   ❌   |  ❌  | ✅  |
| UpdateTable On-Demand                               |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
| UpdateTable Provisioned                             |  ❌  |  ❌  |   ✅    |   ✅   |  ❌  | ✅  |
