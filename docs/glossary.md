---
title: "Glossary"
description: "Terms used when defining and parsing arguments with koi."
layout: article
---

## Flag

A named argument that consumes no additional value. A parsed flag assigns `1` when present or `0` when absent.

## Option

A named argument that consumes the next token as its value, including tokens that start with `-`.

## Positional

An argument supplied without a short or long label. Positional values are consumed in the order their declarations appear.

## Registration context

The function or script root that owns a set of argument and command declarations. See [registration and control flow](/docs/guides/lifecycle) for how registration blocks are completed.
