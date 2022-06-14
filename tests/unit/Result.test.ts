import dedent from 'ts-dedent';
import { isPassing, formatFailureResult, type Result } from '../../src/Result';

describe('isPassing', () => {
  it('returns true when there are no violations', () => {
    const result: Result = {
      violations: [],
    };

    expect(isPassing(result, ['all'])).toEqual(true);
  });

  it('returns false when there are violations', () => {
    const result: Result = {
      violations: [
        {
          description: 'Ensures buttons have discernible text',
          help: 'Buttons must have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/3.5/button-name',
          id: 'button-name',
          tags: ['wcag2a', 'section508'],
          nodes: [],
        },
      ],
    };

    expect(isPassing(result, ['all'])).toEqual(false);
  });

  it('returns true when there are serious violations, but only fails on critical violations', () => {
    const result: Result = {
      violations: [
        {
          description: '<html> element must have a lang attribute',
          help: 'The HTML document element must contain a valid lang attribute',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.1/html-has-lang',
          id: 'html-has-lang',
          tags: ['wcag2a', 'section508'],
          nodes: [],
          impact: 'serious',
        },
      ],
    };

    expect(isPassing(result, ['critical'])).toEqual(true);
  });

  it('returns false when there are serious violations, and fails on serious violations', () => {
    const result: Result = {
      violations: [
        {
          description: '<html> element must have a lang attribute',
          help: 'The HTML document element must contain a valid lang attribute',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.1/html-has-lang',
          id: 'html-has-lang',
          tags: ['wcag2a', 'section508'],
          nodes: [],
          impact: 'serious',
        },
      ],
    };

    expect(isPassing(result, ['critical', 'serious'])).toEqual(false);
  });

  it('returns false when there are critical and serious violations, and fails on critical violations', () => {
    const result: Result = {
      violations: [
        {
          description: '<html> element must have a lang attribute',
          help: 'The HTML document element must contain a valid lang attribute',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.1/html-has-lang',
          id: 'html-has-lang',
          tags: ['wcag2a', 'section508'],
          nodes: [],
          impact: 'serious',
        },
        {
          description: 'Ensures buttons have discernible text',
          help: 'Buttons must have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/3.5/button-name',
          id: 'button-name',
          tags: ['wcag2a', 'section508'],
          nodes: [],
          impact: 'critical',
        },
      ],
    };

    expect(isPassing(result, ['critical'])).toEqual(false);
  });

  it('returns false when there are no violations, and fails on critical violations', () => {
    const result: Result = {
      violations: [],
    };

    expect(isPassing(result, ['critical'])).toEqual(true);
  });
});

describe('formatFailureResult', () => {
  it('pretty prints the failures', () => {
    const result: Result = {
      violations: [
        {
          description: 'Ensures buttons have discernible text',
          help: 'Buttons must have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/button-name',
          id: 'button-name',
          tags: [],
          nodes: [
            {
              html: '<button></button>',
              target: [],
              any: [],
              all: [],
              none: [],
              failureSummary: "Nope, that is not right, because\nIt's not",
            },
          ],
        },
      ],
    };

    expect(formatFailureResult(result)).toEqual(dedent`
      Detected the following accessibility violations!

      1. button-name (Buttons must have discernible text)

         For more info, visit https://dequeuniversity.com/rules/axe/4.0/button-name.

         Check these nodes:

         - html: <button></button>
           summary: Nope, that is not right, because
                    It's not
    `);
  });
});
