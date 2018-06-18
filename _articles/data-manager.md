---
title: Designing a CSV Data Manager
draft: true
---

For my work with CSNW academic projects, we work with a lot of csv data. It works really well for static web apps and can be exported from pretty much anything, so it's a natural fit. There were some challenges with downloading, processing, and querying large datasets in purely client-side javascript, so I focused on creating a csv data manager that made interactions fast and could be reused across projects.