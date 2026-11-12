---
title: "Positional values"
description: "A required source, optional directory, and independent flag."
layout: split
---

The source is required. The directory defaults to `.`. Options may appear between positional values, and `--` lets a dash-prefixed token become data.

```bash
bash copy.sh source.txt -v out
bash copy.sh -- --help
```

This is a mock operation: it prints values and never copies a file.

<!-- koi:example -->

## copy.sh

<!-- koi:include copy.sh -->

## First invocation output

<!-- koi:include copy.txt -->
