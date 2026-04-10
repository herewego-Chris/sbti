const {
  dimensionMeta,
  specialQuestions,
  TYPE_LIBRARY,
  DIM_EXPLANATIONS,
  dimensionOrder,
  shuffle,
  getVisibleQuestions,
  computeResult,
  questions,
} = require('../../utils/sbti-logic');
const TYPE_IMAGES = require('../../utils/type-images');

const OPTION_CODES = ['A', 'B', 'C', 'D'];
const POSTER_CANVAS_ID = 'resultPosterCanvas';
const POSTER_WIDTH = 690;
const POSTER_CANVAS_HEIGHT = 3600;
const MIN_POSTER_HEIGHT = 1420;
const PAGE_PADDING = 58;
const CONTENT_WIDTH = POSTER_WIDTH - PAGE_PADDING * 2;
const MINI_CODE_IMAGE = '/assets/mini/mini-code.jpg';

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function splitTextLines(ctx, text, maxWidth) {
  const paragraphs = String(text || '').replace(/\r/g, '').split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const row = paragraph.trim();
    if (!row) {
      lines.push('');
      return;
    }
    let current = '';
    for (let i = 0; i < row.length; i += 1) {
      const next = current + row[i];
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = row[i];
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  });

  return lines.length ? lines : [''];
}

function truncateLines(lines, maxLines) {
  if (!maxLines || lines.length <= maxLines) return lines;
  const shortLines = lines.slice(0, maxLines);
  const last = shortLines[maxLines - 1] || '';
  if (last.length > 1) {
    shortLines[maxLines - 1] = `${last.slice(0, last.length - 1)}...`;
  } else {
    shortLines[maxLines - 1] = '...';
  }
  return shortLines;
}

Page({
  data: {
    screen: 'intro',
    sharedView: false,

    visibleQuestions: [],
    progressText: '0 / 31',
    progressPercent: 0,
    submitDisabled: true,
    testHint: '全选完才会放行。世界已经够乱了，起码把题做完整。',

    resultModeKicker: '你的主类型',
    resultTypeName: 'CTRL（拿捏者）',
    resultCode: 'CTRL',
    matchBadge: '匹配度 92%',
    resultTypeSub: '系统备注会显示在这里。',
    resultDesc: '',
    posterCaption: '怎么样，被我拿捏了吧？',
    posterImage: '/assets/types/CTRL.jpg',
    funNote: '本测试仅供娱乐，别拿它当诊断、面试、相亲、分手、招魂、算命或人生判决书。',
    dimList: [],
    secondaryTypeName: '',
    sharePosterPath: '',
    saveTip: '',
  },

  onLoad(options) {
    this.previewMode = false;
    this.answers = {};
    this.shuffledQuestions = [];
    this.posterPromise = null;

    if (options && options.shared === '1' && options.code) {
      const code = decodeURIComponent(options.code);
      this.showSharedResult(code);
    }
  },

  onShareAppMessage() {
    const code = encodeURIComponent(this.data.resultCode || 'CTRL');
    return {
      title: `我测出了 ${this.data.resultTypeName}，你也来测测？`,
      path: `/pages/index/index?shared=1&code=${code}`,
      imageUrl: this.data.sharePosterPath || this.data.posterImage || TYPE_IMAGES.CTRL,
    };
  },

  onShareTimeline() {
    return {
      title: `我测出了 ${this.data.resultTypeName}，你也来测测？`,
      query: `shared=1&code=${encodeURIComponent(this.data.resultCode || 'CTRL')}`,
      imageUrl: this.data.sharePosterPath || this.data.posterImage || TYPE_IMAGES.CTRL,
    };
  },

  onStart() {
    this.startTest(false);
  },

  onBackIntro() {
    this.setData({
      screen: 'intro',
      sharedView: false,
      sharePosterPath: '',
      saveTip: '',
    });
  },

  onSubmit() {
    if (this.data.submitDisabled) return;

    const result = computeResult(this.answers);
    const type = result.finalType;
    const dimList = dimensionOrder.map((dim) => ({
      dim,
      dimName: dimensionMeta[dim].name,
      level: result.levels[dim],
      score: result.rawScores[dim],
      explanation: DIM_EXPLANATIONS[dim][result.levels[dim]],
    }));

    this.setData({
      screen: 'result',
      sharedView: false,
      resultModeKicker: result.modeKicker,
      resultTypeName: `${type.code}（${type.cn}）`,
      resultCode: type.code,
      matchBadge: result.badge,
      resultTypeSub: result.sub,
      resultDesc: type.desc,
      posterCaption: type.intro,
      posterImage: TYPE_IMAGES[type.code] || '',
      funNote: result.special
        ? '本测试仅供娱乐。隐藏人格和兜底人格属于作者故意埋的损招，请勿当成医学、心理学、命理学依据。'
        : '本测试仅供娱乐，别拿它当诊断、面试、相亲、分手、招魂、算命或人生判决书。',
      dimList,
      secondaryTypeName: result.secondaryType
        ? `${result.secondaryType.code}（${result.secondaryType.cn}）`
        : '',
      sharePosterPath: '',
      saveTip: '',
    });
    this.warmupSharePoster();
  },

  onRestart() {
    this.startTest(false);
  },

  onToTop() {
    this.setData({
      screen: 'intro',
      sharedView: false,
      sharePosterPath: '',
      saveTip: '',
    });
  },

  async onSaveResultImage() {
    try {
      const posterPath = await this.preparePosterImage();
      await this.savePosterToAlbum(posterPath);
      this.setData({ saveTip: '结果图片已保存到系统相册。' });
    } catch (err) {
      if (!String(err && err.errMsg || '').includes('cancel')) {
        this.setData({ saveTip: '保存失败，请稍后重试。' });
      }
    }
  },

  async onShareResultImage() {
    try {
      const posterPath = await this.preparePosterImage();
      if (typeof wx.showShareImageMenu === 'function') {
        wx.showShareImageMenu({
          path: posterPath,
          success: () => {
            this.setData({ saveTip: '请选择微信好友发送这张结果图。' });
          },
          fail: (err) => {
            if (String(err && err.errMsg || '').includes('cancel')) return;
            this.setData({ saveTip: '当前微信不支持直接转发图片，请先保存到相册后发送。' });
          },
        });
      } else {
        this.setData({ saveTip: '当前微信版本不支持直接转发图片，请先保存到相册后发送。' });
      }
    } catch (err) {
      if (!String(err && err.errMsg || '').includes('cancel')) {
        this.setData({ saveTip: '生成结果图失败，请重试。' });
      }
    }
  },

  onSelectOption(e) {
    const qid = e.currentTarget.dataset.qid;
    const value = Number(e.currentTarget.dataset.value);
    this.answers[qid] = value;

    if (qid === 'drink_gate_q1' && value !== 3) {
      delete this.answers.drink_gate_q2;
    }

    this.refreshTestState();
  },

  startTest(preview = false) {
    this.previewMode = preview;
    this.answers = {};

    const shuffledRegular = shuffle(questions);
    const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1;
    this.shuffledQuestions = [
      ...shuffledRegular.slice(0, insertIndex),
      specialQuestions[0],
      ...shuffledRegular.slice(insertIndex),
    ];

    this.setData({
      screen: 'test',
      sharedView: false,
      sharePosterPath: '',
      saveTip: '',
    });
    this.refreshTestState();
  },

  buildVisibleQuestions() {
    const visible = getVisibleQuestions(this.shuffledQuestions, this.answers);
    return visible.map((q, idx) => ({
      ...q,
      order: idx + 1,
      metaLabel: q.special
        ? '补充题'
        : (this.previewMode ? dimensionMeta[q.dim].name : '维度已隐藏'),
      options: q.options.map((opt, i) => ({
        ...opt,
        code: OPTION_CODES[i] || String(i + 1),
        selected: Number(this.answers[q.id]) === Number(opt.value),
      })),
    }));
  },

  refreshTestState() {
    const visibleQuestions = this.buildVisibleQuestions();
    const total = visibleQuestions.length;
    let done = 0;
    visibleQuestions.forEach((q) => {
      if (this.answers[q.id] !== undefined) done += 1;
    });

    const complete = total > 0 && done === total;
    const progressPercent = total ? (done / total) * 100 : 0;

    this.setData({
      visibleQuestions,
      progressText: `${done} / ${total}`,
      progressPercent,
      submitDisabled: !complete,
      testHint: complete
        ? '都做完了。现在可以把你的电子灵魂交给结果页审判。'
        : '全选完才会放行。世界已经够乱了，起码把题做完整。',
    });
  },

  showSharedResult(code) {
    const type = TYPE_LIBRARY[code] || TYPE_LIBRARY.CTRL;
    this.setData({
      screen: 'result',
      sharedView: true,
      resultModeKicker: '好友分享的人格结果',
      resultTypeName: `${type.code}（${type.cn}）`,
      resultCode: type.code,
      matchBadge: '来自好友分享',
      resultTypeSub: '这是好友分享给你的结果。你也可以点“重新测试”测出自己的类型。',
      resultDesc: type.desc,
      posterCaption: type.intro,
      posterImage: TYPE_IMAGES[type.code] || '',
      funNote: '分享结果仅供娱乐，具体以你自己的完整测评为准。',
      dimList: [],
      secondaryTypeName: '',
      sharePosterPath: '',
      saveTip: '',
    });
    this.warmupSharePoster();
  },

  loadImageInfo(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve({ ok: false, error: 'empty src' });
        return;
      }
      wx.getImageInfo({
        src,
        success: (res) => resolve({ ok: true, data: res }),
        fail: (err) => resolve({ ok: false, error: String(err && err.errMsg || 'getImageInfo fail') }),
      });
    });
  },

  preparePosterImage(silent = false) {
    if (this.data.sharePosterPath) {
      return Promise.resolve(this.data.sharePosterPath);
    }
    if (this.posterPromise) {
      return this.posterPromise;
    }

    if (!silent) {
      wx.showLoading({ title: '生成结果图中...' });
    }
    this.posterPromise = this.buildPosterImage()
      .then((tempPath) => {
        this.setData({ sharePosterPath: tempPath });
        return tempPath;
      })
      .finally(() => {
        if (!silent) {
          wx.hideLoading();
        }
        this.posterPromise = null;
      });
    return this.posterPromise;
  },

  warmupSharePoster() {
    this.preparePosterImage(true).catch(() => {});
  },

  async buildPosterImage() {
    const ctx = wx.createCanvasContext(POSTER_CANVAS_ID, this);
    const imageResult = await this.loadImageInfo(this.data.posterImage);
    const imageInfo = imageResult.ok ? imageResult.data : null;
    const miniCodeResult = await this.loadImageInfo(MINI_CODE_IMAGE);
    const miniCodeInfo = miniCodeResult.ok ? miniCodeResult.data : null;

    ctx.setFillStyle('#f6faf6');
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_CANVAS_HEIGHT);

    ctx.setFillStyle('#ffffff');
    drawRoundRect(ctx, 24, 24, POSTER_WIDTH - 48, POSTER_CANVAS_HEIGHT - 48, 28);
    ctx.fill();
    ctx.setStrokeStyle('#dbe8dd');
    ctx.setLineWidth(2);
    drawRoundRect(ctx, 24, 24, POSTER_WIDTH - 48, POSTER_CANVAS_HEIGHT - 48, 28);
    ctx.stroke();

    let cursor = 96;

    ctx.setFillStyle('#0f172a');
    ctx.setFontSize(32);
    ctx.fillText('SBTI 人格测试结果', PAGE_PADDING, cursor);
    cursor += 40;

    ctx.setFillStyle('#64748b');
    ctx.setFontSize(22);
    ctx.fillText('仅供娱乐，不作任何专业诊断依据', PAGE_PADDING, cursor);
    cursor += 36;

    const frameX = PAGE_PADDING;
    const frameY = cursor;
    const frameW = CONTENT_WIDTH;
    const frameH = 680;
    ctx.setFillStyle('#edf6ef');
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.fill();
    ctx.setStrokeStyle('#dbe8dd');
    ctx.setLineWidth(2);
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.stroke();

    const imagePad = 12;
    const imageFrameX = frameX + imagePad;
    const imageFrameY = frameY + imagePad;
    const imageFrameW = frameW - imagePad * 2;
    const imageFrameH = frameH - imagePad * 2;

    ctx.setFillStyle('#ffffff');
    drawRoundRect(ctx, imageFrameX, imageFrameY, imageFrameW, imageFrameH, 16);
    ctx.fill();

    ctx.setFillStyle('#6a786f');
    ctx.setFontSize(66);
    ctx.fillText(this.data.resultCode || 'CTRL', imageFrameX + 34, imageFrameY + 414);

    if (imageInfo && imageInfo.path && imageInfo.width > 0 && imageInfo.height > 0) {
      const imageRatio = imageInfo.width / imageInfo.height;
      const frameRatio = imageFrameW / imageFrameH;
      let drawW = imageFrameW;
      let drawH = imageFrameH;
      let drawX = imageFrameX;
      let drawY = imageFrameY;

      if (imageRatio > frameRatio) {
        drawH = imageFrameW / imageRatio;
        drawY = imageFrameY + (imageFrameH - drawH) / 2;
      } else {
        drawW = imageFrameH * imageRatio;
        drawX = imageFrameX + (imageFrameW - drawW) / 2;
      }
      ctx.drawImage(this.data.posterImage, drawX, drawY, drawW, drawH);
    } else if (this.data.posterImage) {
      ctx.drawImage(this.data.posterImage, imageFrameX, imageFrameY, imageFrameW, imageFrameH);
      this.setData({ saveTip: `图片信息获取失败，已尝试直接绘制：${imageResult.error || ''}` });
    }

    cursor = frameY + frameH + 56;

    ctx.setFillStyle('#0f172a');
    ctx.setFontSize(42);
    const typeNameLines = truncateLines(
      splitTextLines(ctx, this.data.resultTypeName || 'CTRL（拿捏者）', CONTENT_WIDTH),
      2,
    );
    typeNameLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 52;
    });

    ctx.setFillStyle('#334155');
    ctx.setFontSize(28);
    const badgeLines = truncateLines(
      splitTextLines(ctx, this.data.matchBadge || '', CONTENT_WIDTH),
      2,
    );
    badgeLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 38;
    });

    ctx.setFillStyle('#64748b');
    ctx.setFontSize(24);
    const modeLines = splitTextLines(ctx, this.data.resultModeKicker || '', CONTENT_WIDTH);
    modeLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 34;
    });

    const captionLines = splitTextLines(ctx, this.data.posterCaption || '', CONTENT_WIDTH);
    captionLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 34;
    });

    ctx.setFillStyle('#475569');
    ctx.setFontSize(24);
    const subLines = splitTextLines(ctx, this.data.resultTypeSub || '', CONTENT_WIDTH);
    subLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 34;
    });

    if (this.data.secondaryTypeName) {
      const secondaryLines = splitTextLines(ctx, `常规第一人格：${this.data.secondaryTypeName}`, CONTENT_WIDTH);
      secondaryLines.forEach((line) => {
        ctx.fillText(line, PAGE_PADDING, cursor);
        cursor += 34;
      });
    }

    cursor += 16;
    ctx.setFillStyle('#0f172a');
    ctx.setFontSize(30);
    ctx.fillText('该人格的简单解读', PAGE_PADDING, cursor);
    cursor += 40;

    ctx.setFillStyle('#334155');
    ctx.setFontSize(24);
    const descLines = splitTextLines(ctx, this.data.resultDesc || '', CONTENT_WIDTH);
    descLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 34;
    });

    if (this.data.dimList && this.data.dimList.length) {
      cursor += 18;
      ctx.setFillStyle('#0f172a');
      ctx.setFontSize(30);
      ctx.fillText('十五维度评分', PAGE_PADDING, cursor);
      cursor += 34;

      this.data.dimList.forEach((item) => {
        const itemX = PAGE_PADDING;
        const itemW = CONTENT_WIDTH;
        const itemPadding = 18;

        ctx.setFontSize(24);
        const headText = `${item.dimName}：${item.level} / ${item.score}分`;
        const headLines = splitTextLines(ctx, headText, itemW - itemPadding * 2);

        ctx.setFontSize(22);
        const expLines = splitTextLines(ctx, item.explanation || '', itemW - itemPadding * 2);

        const itemHeight = 22 + headLines.length * 34 + expLines.length * 30 + 20;
        ctx.setFillStyle('#f8fafc');
        drawRoundRect(ctx, itemX, cursor, itemW, itemHeight, 14);
        ctx.fill();

        let itemCursor = cursor + 28;
        ctx.setFillStyle('#0f172a');
        ctx.setFontSize(24);
        headLines.forEach((line) => {
          ctx.fillText(line, itemX + itemPadding, itemCursor);
          itemCursor += 34;
        });

        ctx.setFillStyle('#475569');
        ctx.setFontSize(22);
        expLines.forEach((line) => {
          ctx.fillText(line, itemX + itemPadding, itemCursor);
          itemCursor += 30;
        });
        cursor += itemHeight + 12;
      });
    }

    cursor += 10;
    ctx.setFillStyle('#0f172a');
    ctx.setFontSize(30);
    ctx.fillText('友情提示', PAGE_PADDING, cursor);
    cursor += 40;

    ctx.setFillStyle('#475569');
    ctx.setFontSize(22);
    const noteLines = splitTextLines(ctx, this.data.funNote || '', CONTENT_WIDTH);
    noteLines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, cursor);
      cursor += 30;
    });

    cursor += 18;
    const codeSectionX = PAGE_PADDING;
    const codeSectionY = cursor;
    const codeSectionW = CONTENT_WIDTH;
    const codeSectionH = 210;
    const codeSize = 154;
    const codeX = codeSectionX + codeSectionW - codeSize - 24;
    const codeY = codeSectionY + (codeSectionH - codeSize) / 2;

    ctx.setFillStyle('#edf6ef');
    drawRoundRect(ctx, codeSectionX, codeSectionY, codeSectionW, codeSectionH, 16);
    ctx.fill();
    ctx.setStrokeStyle('#dbe8dd');
    ctx.setLineWidth(2);
    drawRoundRect(ctx, codeSectionX, codeSectionY, codeSectionW, codeSectionH, 16);
    ctx.stroke();

    ctx.setFillStyle('#304034');
    ctx.setFontSize(28);
    ctx.fillText('扫码进入小程序', codeSectionX + 22, codeSectionY + 66);
    ctx.setFillStyle('#6a786f');
    ctx.setFontSize(22);
    ctx.fillText('继续测评 / 分享给朋友', codeSectionX + 22, codeSectionY + 102);
    ctx.fillText('同一小程序内可再次生成结果图', codeSectionX + 22, codeSectionY + 136);

    ctx.setFillStyle('#ffffff');
    drawRoundRect(ctx, codeX - 6, codeY - 6, codeSize + 12, codeSize + 12, 10);
    ctx.fill();

    if (miniCodeInfo && miniCodeInfo.path) {
      ctx.drawImage(MINI_CODE_IMAGE, codeX, codeY, codeSize, codeSize);
    } else {
      ctx.setFillStyle('#f8fafc');
      ctx.fillRect(codeX, codeY, codeSize, codeSize);
      ctx.setStrokeStyle('#dbe8dd');
      ctx.setLineWidth(2);
      ctx.strokeRect(codeX, codeY, codeSize, codeSize);
      ctx.setFillStyle('#6a786f');
      ctx.setFontSize(20);
      ctx.fillText('小程序码', codeX + 34, codeY + 78);
      ctx.fillText('待替换', codeX + 42, codeY + 108);
    }

    cursor = codeSectionY + codeSectionH + 18;
    ctx.setFillStyle('#64748b');
    ctx.setFontSize(20);
    const stamp = `生成时间：${new Date().toLocaleString()}`;
    ctx.fillText(stamp, PAGE_PADDING, cursor);

    const exportHeight = Math.min(
      POSTER_CANVAS_HEIGHT,
      Math.max(MIN_POSTER_HEIGHT, Math.ceil(cursor + 48)),
    );

    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId: POSTER_CANVAS_ID,
            width: POSTER_WIDTH,
            height: exportHeight,
            destWidth: POSTER_WIDTH,
            destHeight: exportHeight,
            fileType: 'jpg',
            quality: 0.9,
            success: (res) => resolve(res.tempFilePath),
            fail: (err) => reject(err),
          },
          this,
        );
      });
    });
  },

  savePosterToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => resolve(),
        fail: (err) => {
          const message = String(err && err.errMsg || '');
          if (message.includes('auth deny') || message.includes('authorize no response')) {
            wx.showModal({
              title: '需要相册权限',
              content: '请允许保存到相册权限后重试。',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting({});
                }
              },
            });
          }
          reject(err);
        },
      });
    });
  },
});
