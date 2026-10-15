# Security

StreamXR runs on YouTube pages while you're signed in, and it makes requests to YouTube as
you (for Subscribe, Like and your feeds). The optional Skip Helper uses Chrome's `debugger`
permission. So security problems matter here, even in a small project.

## Reporting a vulnerability

**Please don't open a public issue.** Use GitHub's private reporting instead: the
repository's **Security** tab -> **Report a vulnerability**. Include what an attacker could
do, the steps to reproduce, and the StreamXR (and Skip Helper) version.

You'll get a reply as soon as the maintainer can; this is a one-person hobby project, so
please allow some time. Once a fix is released, the report can be made public, with credit
if you'd like.

## What counts

For example:

- A web page or another extension getting StreamXR to make requests to YouTube as the user,
  or reading the user's YouTube data through it.
- Anything that makes the Skip Helper act outside its one job (pressing YouTube's visible
  Skip ad button in the tab that asked) or on a tab that isn't youtube.com.
- StreamXR or the Skip Helper needing, or quietly using, more permissions than the
  manifests list.

Bugs that only affect how videos look or play are ordinary issues: use the forms.
