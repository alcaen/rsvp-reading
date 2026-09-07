<script>
  import { onMount, tick } from 'svelte';
  import { getActualORPIndex, computeFitScale, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE_REM } from '../rsvp-utils.js';

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
  let beforeMeasureEl;
  let orpMeasureEl;
  let afterMeasureEl;
  let fitScale = 1;
  let orpHalfPx = 0;
  $: displaySize = baseFontSize * fitScale;

  async function updateFit() {
    await tick();
    if (!displayEl) return;
    const beforeW = beforeMeasureEl?.offsetWidth ?? 0;
    const orpW = orpMeasureEl?.offsetWidth ?? 0;
    const afterW = afterMeasureEl?.offsetWidth ?? 0;
    fitScale = computeFitScale(beforeW, orpW, afterW, displayEl.clientWidth);
    orpHalfPx = (orpW * fitScale) / 2;
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
      style="font-family: {fontFamily}; font-size: {baseFontSize}rem; font-weight: {wordWeight};"
    >
      <span bind:this={beforeMeasureEl}>
        {#if isRtl}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0} {wordsAfter.join(' ')}{/if}
        {:else}
          {#if useMultiMode && wordsBefore.length > 0}{wordsBefore.join(' ')} {/if}{wordPrefix}
        {/if}
      </span>
      <span bind:this={orpMeasureEl}>{focusChar}</span>
      <span bind:this={afterMeasureEl}>
        {#if isRtl}
          {#if useMultiMode && wordsBefore.length > 0}{wordsBefore.join(' ')} {/if}{wordPrefix}
        {:else}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0} {wordsAfter.join(' ')}{/if}
        {/if}
      </span>
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
      --orp-half: {orpHalfPx}px;
    "
  >
    {#if currentWord}
      <span class="orp">{focusChar}</span>
      <span class="before-orp" style="direction: {isRtl ? 'rtl' : 'ltr'}">
        {#if isRtl}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0}
            &nbsp;<span class="context-words">{wordsAfter.join(' ')}</span>
          {/if}
        {:else}
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(' ')}</span>&nbsp;
          {/if}{wordPrefix}
        {/if}
      </span>
      <span class="after-orp" style="direction: {isRtl ? 'rtl' : 'ltr'}">
        {#if isRtl}
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(' ')}</span>&nbsp;
          {/if}{wordPrefix}
        {:else}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0}
            &nbsp;<span class="context-words">{wordsAfter.join(' ')}</span>
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
    width: 100%;
    height: 1.2em;
    line-height: 1;
    white-space: nowrap;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .context-words {
    color: #666;
    font-weight: 400;
  }

  .orp {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    color: #ff4444;
    font-weight: 700;
    text-shadow: 0 0 30px rgba(255, 68, 68, 0.6);
    z-index: 2;
  }

  .word-container.bold .orp {
    font-weight: 800;
  }

  .before-orp {
    position: absolute;
    left: 50%;
    transform: translateX(calc(-100% - var(--orp-half, 0px)));
    color: #fff;
    text-align: right;
  }

  .after-orp {
    position: absolute;
    left: calc(50% + var(--orp-half, 0px));
    color: #fff;
    text-align: left;
  }

  .placeholder {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
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
