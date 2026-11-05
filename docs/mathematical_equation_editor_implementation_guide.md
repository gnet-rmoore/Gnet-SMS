# Mathematical Formula and Equation Editor --- Implementation Recommendation

## 1. Objective

Build a robust mathematical authoring feature in the school management
system so teachers can create, insert, edit, save, and reuse complex
mathematical formulas and equations inside lessons, assignments,
quizzes, and examinations.

**Primary focus:** complex mathematical notation and a reliable
equation-editing experience. The feature must support fractions, nested
fractions, roots, exponents, subscripts, limits, summations, products,
integrals, derivatives, matrices, piecewise functions, vectors, Greek
letters, brackets, and multi-line aligned equations.

Do not build a mathematical editor or LaTeX parser from scratch.
Integrate established libraries and keep the equation source editable.

## 2. Recommended technology

  -----------------------------------------------------------------------
  Responsibility          Recommendation          Purpose
  ----------------------- ----------------------- -----------------------
  Equation authoring      **MathLive**            Interactive equation
                                                  field, visual editing,
                                                  LaTeX input/output,
                                                  virtual math keyboard

  Equation rendering      **MathJax**             Render saved equations
                                                  consistently in
                                                  lessons, student views,
                                                  print views, and
                                                  accessible output

  Main document editor    Existing editor; if     Normal text, headings,
                          choosing one,           lists, tables, images,
                          **Tiptap**              and embedded equation
                                                  nodes

  Optional alternative    KaTeX                   Faster rendering for a
  renderer                                        tested subset of
                                                  supported LaTeX; not
                                                  required if MathJax is
                                                  selected

  Persistence             Existing database       Store canonical LaTeX
                                                  and display metadata;
                                                  do not store equations
                                                  only as screenshots
  -----------------------------------------------------------------------

### Why MathLive + MathJax?

MathLive is the equation authoring component. It gives teachers a visual
equation field and a math-specific virtual keyboard, while supporting
LaTeX as a portable source format.

MathJax is a rendering engine. It displays the stored mathematical
source in the student-facing content and print/export workflows. It is
not a replacement for MathLive's editing interface.

This separation keeps authoring and display responsibilities clear. It
also means teachers can edit the original equation later instead of
having to recreate it from an image.

Official documentation:

-   MathLive: https://mathlive.io/
-   MathLive Mathfield: https://mathlive.io/mathfield/
-   MathLive API: https://mathlive.io/mathfield/api/
-   MathJax: https://docs.mathjax.org/
-   MathJax configuration:
    https://docs.mathjax.org/en/latest/options/index.html
-   Tiptap: https://tiptap.dev/docs/editor/
-   Tiptap custom extensions:
    https://tiptap.dev/docs/editor/extensions/custom-extensions

Check current package versions, framework compatibility, licensing, and
API details against the official documentation before implementation. Do
not assume a method or package API from an old example still exists.

## 3. Scope and user experience

Add an **Insert equation** action to the teacher's existing lesson,
assignment, quiz, and examination editor.

When selected, open an equation-editor dialog or focused editing panel
containing:

1.  A MathLive math field.
2.  A categorized virtual keyboard.
3.  A live rendered preview.
4.  A clear/editable LaTeX source option for advanced users.
5.  **Insert**, **Cancel**, and (when editing an existing equation)
    **Update equation** actions.
6.  A display-mode choice: inline equation or standalone/block equation.

The teacher should not need to know LaTeX. The visual keyboard and
direct manipulation should be the default. Advanced teachers may
optionally type or paste LaTeX.

### Required notation coverage

Test at least these categories:

-   Basic: `+`, `−`, `×`, `÷`, `=`, `≠`, `≈`, `<`, `>`, `≤`, `≥`
-   Fractions: `\frac{a+b}{c+d}`, nested fractions
-   Powers and indices: `x^2`, `a_n`, `x_i^2`
-   Roots: `\sqrt{x}`, `\sqrt[3]{x}`
-   Brackets: parentheses, square brackets, braces, scalable delimiters
-   Greek letters: `\alpha`, `\beta`, `\theta`, `\pi`, `\Delta`, etc.
-   Algebra: polynomials, factorization, quadratic formula
-   Calculus: limits, derivatives, partial derivatives, integrals,
    multiple integrals
-   Series: summations and products with upper/lower bounds
-   Matrices: matrix, determinant, cases, vectors
-   Piecewise functions and systems of equations
-   Multi-line equations and aligned expressions
-   Trigonometry, logarithms, exponentials, and complex numbers
-   Units and common scientific notation

Do not claim support for every LaTeX package or command. MathLive and
MathJax support defined subsets and may have different feature coverage.
Establish a supported-command test suite and provide a useful validation
message for unsupported or malformed input.

## 4. Integration architecture

Use the current application architecture and reuse its existing document
editor, database, authentication, file storage, and PDF-generation
infrastructure. Do not replace working systems without a demonstrated
need.

Recommended flow:

``` text
Teacher opens lesson / assignment / exam editor
                    |
                    v
             Insert equation
                    |
                    v
          MathLive equation dialog
          - visual math keyboard
          - editable equation field
          - LaTeX source
          - preview / validation
                    |
                    v
        Save as an equation document node
                    |
          +---------+----------+
          |                    |
          v                    v
   Persist LaTeX source    Render with MathJax
   and metadata            in student / print view
          |                    |
          +---------+----------+
                    |
                    v
       Reopen node in MathLive for editing
```

### Editor integration

If the application already has a rich-text editor:

-   Keep it.
-   Add a custom equation node/block to it.
-   Add an editor toolbar action to insert an equation.
-   When a user selects an existing equation node, reopen the MathLive
    dialog with its saved LaTeX source.
-   On update, replace the existing node rather than inserting a
    duplicate.
-   Support both inline and block equation nodes.
-   Ensure copy, paste, undo, redo, autosave, and document reload work
    correctly.

If there is no rich-text editor and the project uses React, evaluate
Tiptap as the document editor. Do not add Tiptap solely to get equation
support if the current editor already has a suitable extension
mechanism.

### Suggested equation node representation

Adapt the exact shape to the existing document format. This is an
illustrative content model, not a requirement to change the entire
database schema:

``` json
{
  "type": "mathEquation",
  "attrs": {
    "latex": "\\frac{-b + \\sqrt{b^2 - 4ac}}{2a}",
    "displayMode": "block",
    "version": 1
  }
}
```

For inline equations, set `displayMode` to `inline`.

Store the canonical LaTeX source, not just rendered HTML or an image.
The rendered output should be generated from the source when displaying
the document. If caching rendered output for performance, treat it as a
disposable cache, not the source of truth.

## 5. Data and persistence recommendations

-   Store equation nodes in the same structured document/content field
    used by the existing editor, where practical.
-   Preserve the original LaTeX exactly enough to reopen and edit it.
-   Store display mode and a schema/version marker.
-   Do not create a separate database table for every equation unless
    the existing architecture or reuse requirements justify it.
-   If equations need to be reused independently across multiple
    documents, consider a reusable equation library with ownership,
    permissions, and references.
-   Do not store base64 images inside document JSON. Store uploaded
    media in the existing file/object storage and keep a reference.
-   Validate document ownership and permissions on the server.

## 6. Rendering in student views and generated PDFs

This is a critical part of the feature. A formula that looks correct in
the teacher editor but breaks in student view or a printed examination
is not complete.

### Web rendering

-   Render saved LaTeX with MathJax in student-facing lesson and
    assessment views.
-   Configure MathJax once at the application boundary rather than
    repeatedly creating independent renderers for every equation.
-   When dynamic content is inserted or updated, invoke the documented
    MathJax typesetting/update API for the affected content.
-   Clear old MathJax output before re-typesetting changed content,
    following the current MathJax documentation.
-   Avoid unsafe HTML injection. Treat stored and teacher-entered
    content as untrusted input.
-   Test accessibility and screen-reader behavior.

### PDF and print output

Choose and implement one reliable PDF path based on the application's
existing infrastructure:

1.  Render the final document in a controlled browser environment with
    MathJax loaded, wait for fonts and math typesetting to finish, then
    print to PDF; or
2.  Use a dedicated server-side math-to-SVG/MathML rendering pipeline
    and embed the resulting assets into the PDF.

Do not assume that a browser's print operation will automatically wait
for asynchronous equation rendering. Add an explicit readiness signal
and verify that all equations have finished rendering before PDF
generation.

Test: - Long equations and page breaks - Large matrices - Multi-line
aligned equations - Fractions and radicals - Font availability -
Black-and-white printing - Different page sizes and margins - Equations
near tables, images, and question boundaries

Do not rasterize every equation by default. Prefer vector or semantic
output where the chosen PDF pipeline supports it.

## 7. Input validation and security

-   Treat LaTeX as untrusted user input.
-   Use MathJax's safe configuration and restrict potentially unsafe
    features according to its official security guidance.
-   Do not enable arbitrary HTML, JavaScript, URL, or file access
    through equation content.
-   Do not evaluate mathematical expressions on the server merely to
    render them.
-   Enforce sensible maximum input/document sizes and rendering
    timeouts.
-   Handle malformed LaTeX gracefully; do not crash the entire editor or
    document view.
-   Keep rendering libraries and dependencies updated.
-   Apply normal authentication, authorization, CSRF protections where
    applicable, and upload validation to related endpoints.

## 8. Implementation plan for the AI coding agent

The coding agent must inspect the actual repository before writing code.
It must not assume the framework, database, editor, package manager,
file layout, or deployment platform.

### Phase 0 --- Repository discovery (no code changes)

1.  Inspect the repository structure and read the project instructions
    (`README`, agent instructions, package manifests, and relevant
    architecture notes).
2.  Identify frontend framework, backend framework, language versions,
    package manager, build commands, and test commands.
3.  Locate the teacher editor used for lessons, assignments, quizzes,
    and examinations.
4.  Determine whether the editor is Tiptap, Quill, TinyMCE, CKEditor, a
    custom editor, or a plain textarea.
5.  Identify the document persistence format and relevant database
    models/API routes.
6.  Locate student-facing renderers and PDF/print generation code.
7.  Report findings and propose the smallest compatible implementation
    before modifying files.

**Stop and report** if the current editor cannot safely support custom
equation nodes or if the persistence/rendering design is unclear.
Recommend options rather than silently replacing major application
components.

### Phase 1 --- Build a focused proof of concept

1.  Install the current compatible MathLive package using the
    repository's package manager.
2.  Create a small isolated equation-editor component.
3.  Confirm MathLive loads correctly in the actual frontend framework
    and build setup.
4.  Implement insert, edit, cancel, inline/block mode, and LaTeX
    extraction.
5.  Verify the required notation examples in the test list.
6.  Confirm keyboard behavior on desktop and a touch device/responsive
    viewport.
7.  Add focused component tests.

Do not yet change the full document format or migrate existing content.

### Phase 2 --- Integrate with the existing editor

1.  Add a custom equation node or the closest supported extension
    mechanism.
2.  Add an **Insert equation** toolbar action.
3.  Support both inline and block equations.
4.  Support reopening and updating an existing equation.
5.  Preserve editor undo/redo, selection, cursor position, autosave, and
    reload behavior.
6.  Save canonical LaTeX and display metadata in the existing document
    format.
7.  Add backward-compatible handling so existing documents without
    equation nodes continue to work.

### Phase 3 --- Student rendering

1.  Add MathJax using the current supported integration method.
2.  Render inline and block equations in student-facing lessons and
    assessments.
3.  Ensure dynamic content updates are typeset correctly.
4.  Add loading/error states and prevent a single malformed equation
    from breaking the page.
5.  Verify responsive behavior and accessibility.

### Phase 4 --- PDF and print

1.  Trace the existing PDF generation path.
2.  Integrate MathJax rendering into that path, or select a compatible
    server-side rendering approach.
3.  Add a deterministic "math rendering complete" signal before
    printing/exporting.
4.  Test multi-page documents and difficult notation.
5.  Compare the same equation in teacher editor, student view, browser
    print, and downloaded PDF.

### Phase 5 --- Release hardening

1.  Add tests for permissions, saving, reopening, editing, autosave, and
    malformed input.
2.  Test large documents containing many equations.
3.  Check bundle size and lazy-load the equation editor where
    appropriate.
4.  Document installation, configuration, supported notation, and
    maintenance.
5.  Add a short teacher-facing guide with screenshots or a walkthrough.
6.  Deploy behind a feature flag or to a limited group first if the
    application supports it.

## 9. Acceptance criteria

The feature is ready only when all of the following are true:

-   [ ] A teacher can insert an equation without knowing LaTeX.
-   [ ] A teacher can create nested fractions, roots, powers,
    subscripts, matrices, integrals, summations, limits, and aligned
    equations.
-   [ ] A teacher can optionally enter or paste LaTeX.
-   [ ] A teacher can preview an equation before inserting it.
-   [ ] A teacher can reopen and edit a previously saved equation.
-   [ ] Inline and block display modes work.
-   [ ] Equations survive save, reload, autosave, and document editing.
-   [ ] Existing lessons and assessments remain unaffected.
-   [ ] Students see correctly rendered equations.
-   [ ] Generated PDFs and printed examinations show equations
    correctly.
-   [ ] Malformed or unsupported notation produces a recoverable error.
-   [ ] The feature works at supported mobile/tablet sizes.
-   [ ] No equation content can execute arbitrary HTML or JavaScript.

## 10. Test fixture equations

Use these as repeatable test cases in the proof of concept and automated
tests.

**Quadratic formula**

``` latex
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

**Nested fraction**

``` latex
\frac{1+\frac{a}{b}}{1-\frac{c}{d}}
```

**Definite integral**

``` latex
\int_{0}^{\infty} e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
```

**Limit**

``` latex
\lim_{x \to 0}\frac{\sin x}{x}=1
```

**Summation**

``` latex
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
```

**Matrix**

``` latex
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
```

**Piecewise function**

``` latex
f(x)=
\begin{cases}
x^2 & x \geq 0 \\
-x & x < 0
\end{cases}
```

**Aligned equations**

``` latex
\begin{aligned}
2x + 3y &= 7 \\
x - y &= 1
\end{aligned}
```

Confirm each fixture against the actual MathLive input and MathJax
output configurations used by the application.

## 11. Explicit instructions to the AI coding agent

Use the following working rules:

1.  **Inspect first; implement second.** Do not guess the stack or
    editor.
2.  Make the smallest change that integrates with the current
    architecture.
3.  Do not rewrite or replace the existing lesson/assessment editor
    without presenting a clear technical reason and obtaining approval.
4.  Do not save equations only as PNG/JPG or rendered HTML. Preserve
    editable LaTeX.
5.  Do not use MathJax as the equation-authoring UI. Use MathLive for
    authoring.
6.  Do not claim PDF support until the generated PDF has been visually
    tested with the fixture equations.
7.  Do not add drawing, OCR, or unrelated features in the first
    implementation. Keep this work focused on complex equations.
8.  Follow the project's coding conventions, validation patterns,
    authentication, authorization, and testing practices.
9.  Add or update tests and run the project's relevant checks. Report
    commands run and results honestly.
10. Do not make destructive database migrations or alter production
    data.
11. If a requirement conflicts with the existing architecture, explain
    the conflict and propose the least disruptive alternative.
12. At completion, report changed files, dependencies added, data
    format, configuration, tests, known limitations, and deployment
    steps.

## 12. Suggested task prompt for the coding agent

> Implement the mathematical equation authoring feature described in
> this document in the existing school management system.
>
> Start with repository discovery. Identify the current frontend/backend
> stack, teacher content editor, document storage format, student
> rendering path, and PDF generation process. Do not modify code until
> you have reported the architecture and a minimal integration plan.
>
> Use MathLive as the interactive equation editor and MathJax for
> rendering saved equations. Integrate with the existing rich-text
> editor using a custom equation node or the most appropriate existing
> extension mechanism. If the application has no suitable rich-text
> editor, explain the options before introducing one.
>
> Prioritize complex mathematical notation: nested fractions, radicals,
> exponents, subscripts, limits, integrals, derivatives, summations,
> matrices, piecewise functions, and aligned equations. Teachers must be
> able to create equations visually without knowing LaTeX, preview them,
> insert them inline or as blocks, and reopen/edit them later.
>
> Preserve the original LaTeX source and display metadata in the
> existing structured document format. Render equations correctly in
> student-facing pages and the application's generated PDFs. Add
> validation, error handling, security controls, and automated tests.
>
> Implement in small phases, run the project's checks, and document
> every changed file and dependency. Do not implement drawing tools,
> OCR, or PDF extraction in this task. Do not replace existing
> application components or make destructive migrations without
> approval.
>
> Use current official library documentation to verify APIs and
> compatibility. Do not invent APIs or report untested functionality as
> complete.

------------------------------------------------------------------------

## Final decision

**Start with MathLive + MathJax.** Integrate MathLive into the existing
teacher content editor as an editable equation node, preserve LaTeX as
the source of truth, and use MathJax to render the equation in student
views and PDFs.

Keep Excalidraw and OCR as separate future phases. This reduces
implementation risk and gives the school a dependable foundation for
complex mathematics first.
