import type { AnyFramework } from '@storybook/csf';
import type { PreviewWeb } from '@storybook/preview-web';
import type { Story } from '@storybook/store';
import type { Page } from 'playwright';
import dedent from 'ts-dedent';
import type { ProcessedStory } from '../ProcessedStory';

// Functions we pass to `page.evaluate` execute in a browser environment, and can access window.
// eslint-disable-next-line no-var
declare var window: {
  __STORYBOOK_PREVIEW__: PreviewWeb<AnyFramework>
};

/**
 * Storybook's internal representation of a story.
 */
export type StorybookStory = Pick<Story, 'id' | 'kind' | 'name' | 'parameters'>;

/**
 * Get the list of stories from a static storybook build.
 */
export async function getStories(page: Page): Promise<StorybookStory[]> {
  const rawStories = await page.evaluate(fetchStoriesFromWindow);

  if (!rawStories) {
    throw new Error(dedent`
      Stories could not be retrieved from storybook!

      Please check the following
      - Is storybook being successfully built into a static directory before running axe-storybook?
      - Is axe-storybook pointing at the static storybook build? By default it looks for ./storybook-static, but that can be configured with a CLI option.

      If everything looks good with those, this is likely a bug with axe-storybook-testing. Reporting a bug would be greatly appreciated!
    `);
  }

  return rawStories;
}

/**
 * Render a story on a Storybook page.
 */
export async function showStory(page: Page, story: ProcessedStory): Promise<void> {
  await page.evaluate(emitSetCurrentStory, story.storybookId);
}

/**
 * Get a list of stories from Storybook's internal API.
 *
 * Executes in a browser context.
 */
function fetchStoriesFromWindow(): Promise<StorybookStory[]> {
  return new Promise((resolve, reject) => {
    // Check if the window has stories every 100ms for up to 10 seconds.
    // This allows 10 seconds for any async pre-tasks (like fetch) to complete.
    // Usually stories will be found on the first loop.
    function checkStories(timesCalled: number) {
      const storybookPreview = window.__STORYBOOK_PREVIEW__;

      if (storybookPreview) {
        const serializableStories = storybookPreview.storyStore.raw().map(pickOnlyNecessaryAndSerializableStoryProperties);
        resolve(serializableStories);
      } else if (timesCalled < 100) {
        // Stories not found yet, try again 100ms from now
        setTimeout(() => {
          checkStories(timesCalled + 1);
        }, 100);
      } else {
        reject(new Error('Storybook object not found on window! Either Storybook has encountered an error, or the version of Storybook is incompatible with this version of axe-storybook-testing.'));
      }
    }

    // Pick only the properties we need from Storybook's representation of a story.
    //
    // This is necessary because Playwright's `page.evaluate` requires return values to be JSON
    // serializable, so we need to make sure there are no non-serializable things in this object.
    // There's no telling what Storybook addons people are using, and whether their parameters are
    // serializable or not.
    //
    // See https://github.com/chanzuckerberg/axe-storybook-testing/issues/44 for a bug caused by this.
    function pickOnlyNecessaryAndSerializableStoryProperties(story: Story): StorybookStory {
      return {
        id: story.id,
        name: story.name,
        kind: story.kind,
        parameters: {
          axe: story.parameters.axe,
        },
      };
    }

    checkStories(0);
  });
}

/**
 * Abuse Storybook's internal APIs to render a story without requiring a page reload (which would
 * be slow).
 *
 * Doing so is brittle, and updates to Storybook could break this. The trade off is that we don't
 * have to figure out how to process stories with Webpack - Storybook handles that for us.
 *
 * Executes in a browser context.
 */
function emitSetCurrentStory(id: string) {
  const storybookPreview = window.__STORYBOOK_PREVIEW__;

  if (!storybookPreview) {
    return Promise.reject(new Error("Storybook doesn't seem to be running on the page"));
  }

  storybookPreview.channel.emit('setCurrentStory', {
    storyId: id,
    viewMode: 'story',
    options: {
      target: 'storybook-preview-iframe',
    },
  });

  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
