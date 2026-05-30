// جلب أسعار الذهب من gold-era.eg مباشرة
async function fetchGoldPricesFromGoldEra() {
  try {
    // استخدام CORS proxy للالتفاف حول CORS restrictions
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const targetUrl = 'https://gold-era.eg/ar/%d8%b3%d8%b9%d8%b1-%d8%a7%d9%84%d8%b0%d9%87%d8%a8/';
    
    const response = await fetch(proxyUrl + targetUrl);
    const html = await response.text();
    
    // تحليل الـ HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // محاولة استخراج الأسعار من عناصر مختلفة
    // نبحث عن جداول أو عناصر تحتوي على الأسعار
    let priceElements = doc.querySelectorAll('table td, .price, [data-price], .amount');
    
    // إذا لم نجد عناصر، نحاول البحث عن نصوص تحتوي على أرقام
    if (priceElements.length === 0) {
      priceElements = doc.querySelectorAll('div, span, td');
    }
    
    const prices = {
      carat24: null,
      carat21: null,
      carat18: null,
      timestamp: new Date().toLocaleString('ar-EG')
    };
    
    // استخراج الأسعار
    let caratIndex = 0;
    for (let el of priceElements) {
      const text = el.textContent.trim();
      // البحث عن أرقام في النص
      const numberMatch = text.match(/\d+\.?\d*/);
      
      if (numberMatch && caratIndex < 3) {
        const price = parseFloat(numberMatch[0]);
        
        // التحقق من أن القيمة معقولة (ليست رقم صفحة أو شيء عشوائي)
        if (price > 50 && price < 10000) {
          if (caratIndex === 0) prices.carat24 = price;
          else if (caratIndex === 1) prices.carat21 = price;
          else if (caratIndex === 2) prices.carat18 = price;
          caratIndex++;
        }
      }
    }
    
    console.log('الأسعار المستخرجة:', prices);
    return prices;
  } catch (error) {
    console.error('خطأ في جلب الأسعار من gold-era.eg:', error);
    return null;
  }
}

// جلب سعر الصرف (دولار إلى جنيه مصري) - للاحتياطي
async function getEGPRate() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    return data.rates.EGP || 30;
  } catch (error) {
    console.warn('خطأ في جلب سعر الصرف');
    return 30;
  }
}

// عرض الأسعار في الصفحة
async function displayGoldPrices() {
  // محاولة الجلب من gold-era.eg أولاً
  let prices = await fetchGoldPricesFromGoldEra();
  
  if (!prices || !prices.carat24) {
    document.getElementById('gold-prices').innerHTML = 
      '<p style="color: orange; text-align: center; padding: 20px;">⚠️ جاري تحديث الأسعار من الموقع...</p>';
    return;
  }
  
  const html = `
    <div class="gold-prices-container">
      <h2>أسعار الذهب اليوم</h2>
      <p class="timestamp">⏰ آخر تحديث: ${prices.timestamp}</p>
      <p class="source">📍 المصدر: gold-era.eg</p>
      
      <div class="prices-grid">
        <div class="price-card carat-24">
          <h3>24 قيراط</h3>
          <div class="price">${prices.carat24.toFixed(2)}</div>
          <p>جنيه/جرام</p>
        </div>
        
        <div class="price-card carat-21">
          <h3>21 قيراط</h3>
          <div class="price">${prices.carat21.toFixed(2)}</div>
          <p>جنيه/جرام</p>
        </div>
        
        <div class="price-card carat-18">
          <h3>18 قيراط</h3>
          <div class="price">${prices.carat18.toFixed(2)}</div>
          <p>جنيه/جرام</p>
        </div>
      </div>
      
      <button onclick="displayGoldPrices()" class="refresh-btn">🔄 تحديث</button>
    </div>
  `;
  
  document.getElementById('gold-prices').innerHTML = html;
}

// تحديث الأسعار كل 30 دقيقة تلقائياً
setInterval(displayGoldPrices, 30 * 60 * 1000);

// عرض الأسعار عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', displayGoldPrices);