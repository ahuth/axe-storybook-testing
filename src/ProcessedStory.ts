import type {RunOptions} from 'axe-core';
import {z as zod} from 'zod';
import type {StorybookStory} from './browser/StorybookPage';

type Params = {
  disabledRules: string[];
  mode: 'off' | 'warn' | 'error';
  runOptions?: RunOptions;
  skip: boolean;
  timeout: number;
  /** @deprecated */
  waitForSelector?: string;
};

/**
 * Story with normalized and custom properties needed by this project.
 */
export default class ProcessedStory {
  name: string;
  componentTitle: string;
  id: string;
  private parameters: Params;

  constructor(rawStory: StorybookStory) {
    this.name = rawStory.name;
    this.componentTitle = rawStory.kind;
    this.id = rawStory.id;
    this.parameters = {
      skip: normalizeSkip(rawStory.parameters?.axe?.skip, rawStory),
      disabledRules: normalizeDisabledRules(
        rawStory.parameters?.axe?.disabledRules,
        rawStory,
      ),
      mode: normalizeMode(rawStory.parameters?.axe?.mode, rawStory),
      waitForSelector: normalizeWaitForSelector(
        rawStory.parameters?.axe?.waitForSelector,
        rawStory,
      ),
      timeout: normalizeTimeout(rawStory.parameters?.axe?.timeout, rawStory),
      runOptions: normalizeRunOptions(
        rawStory.parameters?.axe?.runOptions,
        rawStory,
      ),
    };
  }

  /**
   * Run option for rules to disable in a given story
   */
  get disabledRules() {
    return this.parameters.disabledRules;
  }

  /**
   * Whether axe should even run on this story or not.
   */
  get shouldNotEvenRunTest() {
    return this.parameters.mode === 'off' || this.parameters.skip;
  }

  /**
   * Whether axe violations should cause the test suite to fail or not.
   */
  get shouldFailTestSuiteIfViolations() {
    return this.parameters.mode === 'error';
  }

  /**
   * All optional run options used for a given story
   * @see https://www.deque.com/axe/core-documentation/api-documentation/#options-parameter
   */
  get runOptions() {
    return this.parameters.runOptions;
  }

  /**
   * Timeout override for a test triggered in runSuite()
   */
  get timeout() {
    return this.parameters.timeout;
  }

  /** @deprecated */
  get waitForSelector() {
    return this.parameters.waitForSelector;
  }
}

const disabledRulesSchema = zod.array(zod.string()).optional();
const modeSchema = zod.enum(['off', 'warn', 'error']).optional();
const skipSchema = zod.boolean().optional();
const timeoutSchema = zod.number().gte(0).optional();
const waitForSelectorSchema = zod.string().optional();

const runOptionsSchema = zod.optional(
  zod.object({
    runOnly: zod.optional(
      zod.object({
        type: zod.enum(['rule', 'rules', 'tag', 'tags']),
        values: zod.array(zod.string()),
      }),
    ),
    rules: zod.optional(
      zod.object({}).catchall(
        zod.object({
          enabled: zod.boolean(),
        }),
      ),
    ),
    reporter: zod.optional(
      zod.enum(['v1', 'v2', 'raw', 'raw-env', 'no-passes']),
    ),
    resultTypes: zod.optional(
      zod.array(
        zod.enum(['inapplicable', 'passes', 'incomplete', 'violations']),
      ),
    ),
    selector: zod.optional(zod.boolean()),
    ancestry: zod.optional(zod.boolean()),
    xpath: zod.optional(zod.boolean()),
    absolutePaths: zod.optional(zod.boolean()),
    iframes: zod.optional(zod.boolean()),
    elementRef: zod.optional(zod.boolean()),
    frameWaitTime: zod.optional(zod.number().gte(0)),
    preload: zod.optional(zod.boolean()),
    performanceTimer: zod.optional(zod.boolean()),
    pingWaitTime: zod.optional(zod.number().gte(0)),
  }),
);

function normalizeSkip(skip: unknown, rawStory: StorybookStory) {
  return parseWithFriendlyError(
    () => skipSchema.parse(skip) || false,
    rawStory,
    'skip',
  );
}

function normalizeDisabledRules(
  disabledRules: unknown,
  rawStory: StorybookStory,
) {
  return parseWithFriendlyError(
    () => disabledRulesSchema.parse(disabledRules) || [],
    rawStory,
    'disabledRules',
  );
}

function normalizeTimeout(timeout: unknown, rawStory: StorybookStory) {
  return parseWithFriendlyError(
    () => timeoutSchema.parse(timeout) || 0,
    rawStory,
    'timeout',
  );
}

function normalizeRunOptions(runOptions: unknown, rawStory: StorybookStory) {
  return parseWithFriendlyError(
    () => runOptionsSchema.parse(runOptions) || {},
    rawStory,
    'runOptions',
  );
}

function normalizeWaitForSelector(
  waitForSelector: unknown,
  rawStory: StorybookStory,
) {
  return parseWithFriendlyError(
    () => waitForSelectorSchema.parse(waitForSelector),
    rawStory,
    'waitForSelector',
  );
}

function normalizeMode(mode: unknown, rawStory: StorybookStory) {
  return parseWithFriendlyError(
    () => modeSchema.parse(mode) || 'error',
    rawStory,
    'mode',
  );
}

/**
 * Our Parameter parsers use Zod under the hood, which works great. Unfortunately, there's no way
 * to provide a custom error message when parsing, and its default error messages won't give users
 * enough information about what went wrong and where. Instead we'll catch errors from the parsers
 * and re-throw our own.
 */
function parseWithFriendlyError<T>(
  parser: () => T,
  rawStory: StorybookStory,
  paramName: string,
): T {
  try {
    return parser();
  } catch (message) {
    if (message instanceof zod.ZodError) {
      throw new TypeError(
        `Invalid value for parameter "${paramName}" in component "${rawStory.kind}", story "${rawStory.name}"`,
      );
    } else {
      throw message;
    }
  }
}
