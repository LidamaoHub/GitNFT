import fetch from 'node-fetch';
import pLimit from 'p-limit';

/**
 * 将图片转换为 Base64，支持超时控制
 * @param {string} imageUrl 图片 URL
 * @param {number} timeout 超时时间（单位：毫秒）
 * @returns {Promise<string>} Base64 编码的图片
 */
async function imageToBase64(imageUrl, timeout = 5000) {  // 默认超时时间为10秒
  const startTime = Date.now(); // 记录开始时间
  
  // 检查 URL 是否包含 'w' 参数，表示图片可调整大小
  const modifiedUrl = imageUrl.includes('?w=') 
    ? imageUrl.replace(/w=\d+/, 'w=200')  // 将宽度调整为 200
    : imageUrl; // 如果没有 'w' 参数，直接使用原 URL

  // 创建一个超时 Promise
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`请求超时：${modifiedUrl}`)), timeout)
  );

  // 使用 Promise.race 来并行执行请求和超时
  const fetchPromise = fetch(modifiedUrl)
    .then(res => res.buffer())
    .then(buffer => `data:image/png;base64,${buffer.toString('base64')}`);

  // race 会竞争 fetch 和 timeout
  try {
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const elapsedTime = Date.now() - startTime; // 计算请求耗时
    console.log(`获取图片 ${modifiedUrl} 耗时: ${elapsedTime}ms`);
    return result;
  } catch (error) {
    console.error(`图片获取失败（超时或其他错误）: ${modifiedUrl}`);
    return null;  // 请求失败时返回 null
  }
}

/**
 * 生成 NFT 拼图 SVG（适用于 GitHub README）
 * @param {Array} nfts NFT 列表
 * @param {number} count 要显示的 NFT 数量（最大 50）
 * @param {number} concurrency 最大并发请求数量
 * @param {number} timeout 每个图片请求的超时时间（单位：毫秒）
 * @returns {string} SVG 字符串
 */
export async function generateNFTSVG(nfts, count = 9, concurrency = 5, timeout = 5000) {
  const maxPerRow = 9; // 每行最多显示 9 个
  const cellSize = 90; // 每个 NFT 图片大小
  const spacing = 2; // NFT 之间的间隔
  const width = 830; // 固定宽度
  const height = 115; // 固定高度

  let svgContent = '';

  const limit = pLimit(concurrency); // 设置最大并发数
  const imageUrls = nfts.slice(0, count).map(nft => nft.display_image_url || '');

  // 创建限制并发的任务队列
  const tasks = imageUrls.map(url =>
    limit(async () => {
      const base64Image = await imageToBase64(url, timeout); // 获取 Base64 编码的图片，带超时
      return base64Image;
    })
  );

  // 执行所有任务并等待它们完成
  const base64Images = await Promise.all(tasks);
  console.log('所有图片获取完成');

  for (let i = 0; i < count; i++) {
    const nft = nfts[i] || {}; // 若 NFT 不足 count 个，则填充空白
    const x = (i % maxPerRow) * (cellSize + spacing) + spacing;
    const y = spacing + 20; // 20px 预留标题空间

    const base64Image = base64Images[i];

    // 若请求失败，则不显示该图片
    if (base64Image) {
      svgContent += `<image x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" href="${base64Image}" />`;
    } 
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="">
      <text x="50%" y="15" text-anchor="middle" font-size="16" fill="#333" font-weight="bold">NFT Collection</text>
      ${svgContent}
    </svg>
  `;
}