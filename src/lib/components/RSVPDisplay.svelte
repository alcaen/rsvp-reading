<script>
  import { onMount, tick } from 'svelte';
  import { getActualORPIndex, computeWordFitScale, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE_REM } from '../rsvp-utils.js';

  export let word = '';
  export let wordGroup = [];
  export let highlightIndex = 0;
  export let opacity = 1;
  export let fadeDuration = 150;
  export let fadeEnabled = true;
  export let multiWordEnabled = false;
  export let fontFamily = DEFAULT_FONT_FAMILY;
  export let fontSizeRem = DEFAULT_FONT_SIZE_REM;
  export let fontBold = false;

  $: useMultiMode = multiWordEnabled && wordGroup.length > 0;

  // Get the current word (either from single mode or the highlighted word in group)
  $: currentWord = useMultiMode ? (wordGroup[highlightIndex] || '') : word;

  // Always calculate ORP for the current word
  $: orpIdx = currentWord ? getActualORPIndex(currentWord) : -1;
  $: wordPrefix = currentWord ? currentWord.slice(0, orpIdx) : '';
  $: focusChar = currentWord ? (currentWord[orpIdx] || '') : '';
  $: wordSuffix = currentWord ? currentWord.slice(orpIdx + 1) : '';

  // Words before and after the highlighted word (for multi-word mode)
  $: wordsBefore = useMultiMode ? wordGroup.slice(0, highlightIndex) : [];
  $: wordsAfter = useMultiMode ? wordGroup.slice(highlightIndex + 1) : [];

  // FIX: Detect Hebrew, Arabic, and other RTL scripts
  $: isRtl = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(currentWord);

  $: baseFontSize = useMultiMode ? fontSizeRem * 0.5 : fontSizeRem;
  $: wordWeight = fontBold ? 700 : 500;

  let displayEl;
  let measureEl;
  let fitScale = 1;
  $: displaySize = baseFontSize * fitScale;

  async function updateFit() {
    await tick();
    if (!displayEl) return;
    fitScale = computeWordFitScale(measureEl?.offsetWidth ?? 0, displayEl.clientWidth);
  }

  $: currentWord, fontFamily, baseFontSize, wordWeight, useMultiMode, isRtl, updateFit();

  onMount(() => {
    const observer = new ResizeObserver(() => { updateFit(); });
    if (displayEl) observer.observe(displayEl);
    updateFit();
    return () => observer.disconnect();
  });
</script>

<div class="rsvp-display" bind:this={displayEl}>
  <div class="focus-marker">
    <div class="marker-line top"></div>
    <div class="marker-line bottom"></div>
  </div>

  {#if currentWord}
    <div
      class="measure"
      aria-hidden="true"
      bind:this={measureEl}
      style="font-family: {fontFamily}; font-size: {baseFontSize}rem; font-weight: {wordWeight};"
    >
      {#if isRtl}
        {#if useMultiMode && wordsAfter.length > 0}{wordsAfter.join(' ')} {/if}{wordSuffix}{focusChar}{wordPrefix}{#if useMultiMode && wordsBefore.length > 0} {wordsBefore.join(' ')}{/if}
      {:else}
        {#if useMultiMode && wordsBefore.length > 0}{wordsBefore.join(' ')} {/if}{wordPrefix}{focusChar}{wordSuffix}{#if useMultiMode && wordsAfter.length > 0} {wordsAfter.join(' ')}{/if}
      {/if}
    </div>
  {/if}

  <div
    class="word-container"
    class:multi-mode={useMultiMode}
    class:bold={fontBold}
    style="
      opacity: {opacity};
      transition: opacity {fadeEnabled ? fadeDuration : 0}ms ease-in-out;
      font-family: {fontFamily};
      font-size: {displaySize}rem;
      font-weight: {wordWeight};
    "
  >
    {#if currentWord}
      <span class="word" style="direction: {isRtl ? 'rtl' : 'ltr'}">
        {#if isRtl}
          {#if useMultiMode && wordsAfter.length > 0}
            <span class="context-words">{wordsAfter.join(' ')}</span>
          {/if}
          <span class="after-orp">{wordSuffix}</span>
          <span class="orp">{focusChar}</span>
          <span class="before-orp">{wordPrefix}</span>
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(' ')}</span>
          {/if}
        {:else}
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(' ')}</span>
          {/if}
          <span class="before-orp">{wordPrefix}</span>
          <span class="orp">{focusChar}</span>
          <span class="after-orp">{wordSuffix}</span>
          {#if useMultiMode && wordsAfter.length > 0}
            <span class="context-words">{wordsAfter.join(' ')}</span>
          {/if}
        {/if}
      </span>
    {:else}
      <span class="placeholder">Ready</span>
    {/if}
  </div>
</div>

<style>
  .rsvp-display {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    overflow: hidden;
  }

  .focus-marker {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    height: 100%;
    width: 3px;
    pointer-events: none;
    z-index: 10;
  }

  .marker-line {
    position: absolute;
    left: 0;
    width: 100%;
    height: 50px;
  }

  .marker-line.top {
    top: 0;
    background: linear-gradient(to bottom, #ff4444, transparent);
  }

  .marker-line.bottom {
    bottom: 0;
    background: linear-gradient(to top, #ff4444, transparent);
  }

  .measure {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
    left: 0;
    top: 0;
    line-height: 1;
  }

  .word-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    line-height: 1;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .word {
    display: flex;
    align-items: baseline;
    white-space: nowrap;
    color: #fff;
  }

  .context-words {
    color: #666;
    font-weight: 400;
  }

  .context-words + .before-orp,
  .before-orp + .context-words,
  .after-orp + .context-words,
  .context-words + .after-orp {
    margin-inline-start: 0.35em;
  }

  .orp {
    color: #ff4444;
    font-weight: 700;
    text-shadow: 0 0 30px rgba(255, 68, 68, 0.6);
    z-index: 2;
  }

  .word-container.bold .orp {
    font-weight: 800;
  }

  .placeholder {
    color: #333;
    font-size: 2rem;
    font-weight: 300;
    font-family: system-ui, sans-serif;
    line-height: 1;
  }

  @media (max-width: 600px) {
    .marker-line {
      height: 30px;
    }
  }

  @media (max-height: 500px) {
    .marker-line {
      height: 20px;
    }
  }
</style>
