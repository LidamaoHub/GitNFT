/**
 * 生成 NFT 拼图 SVG（适用于 GitHub README）
 * @param {Array} nfts NFT 列表
 * @param {number} count 要显示的 NFT 数量（最大 50）
 * @returns {string} SVG 字符串
 */
export function generateNFTSVG(nfts, count = 9) {
  count = Math.min(count, 9); // 限制最大值 50
  const maxPerRow = 9; // 每行最多显示 9 个
  const cellSize = 90; // 每个 NFT 图片大小
  const spacing = 2; // NFT 之间的间隔
  const width = 830; // 固定宽度
  const height = 115; // 固定高度

  let svgContent = '';

  for (let i = 0; i < count; i++) {
    const nft = nfts[i] || {}; // 若 NFT 不足 count 个，则填充空白
    const x = (i % maxPerRow) * (cellSize + spacing) + spacing;
    const y = spacing + 20; // 20px 预留标题空间

    const rawImageUrl = nft.display_image_url || 'https://via.placeholder.com/80';
const safeImageUrl = rawImageUrl.replace(/&/g, '&amp;'); // 只转义 `&` 避免 SVG 解析问题
    svgContent += `<image x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" href="${safeImageUrl}" />`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#fff;">
      <text x="50%" y="15" text-anchor="middle" font-size="16" fill="#333" font-weight="bold">NFT Collection</text>
      ${svgContent}
    </svg>
  `;
}