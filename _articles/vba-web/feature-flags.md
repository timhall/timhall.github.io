---
title: VBA-Web Feature Flags
draft: true
---

Feature Flags

```vb
Public Function Testing As String
  Dim Name As String

#if feature
  Name = "A"
#else
  Name = "B"
#endif  
End Function
```
