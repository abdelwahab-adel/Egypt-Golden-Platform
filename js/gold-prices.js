// جلب أسعار الذهب من API موثوق
async function fetchGoldPrices() {
  try {
    // استخدام API من metals API (مجاني)
    const response = await fetch('https://api.metals.live/v1/spot/gold');
    const data = await response.json();
    
    // الأسعار بالدولار للأوقية (oz)
    // نحتاج تحويلها إلى سعر الجرام
    const pricePerOz = data.price; // سعر الأوقية بالدولار
    const pricePerGram = pricePerOz / 31.1035; // تحويل لسعر الجرام
    
    // تحويل من دولار إلى جنيه مصري (استخدم سعر صرف حالي)
    // يمكن تحديث هذا السعر من API صرف العملات
    const exchangeRate = await getEGPRate(); // جنيه مصري
    const priceInEGP = pricePerGram * exchangeRate;
    
    // حساب الأسعار حسب العيارات
    const goldPrices = {
      carat24: priceInEGP, // 24 قيراط (100%)
      carat21: (priceInEGP * 21) / 24, // 21 قيراط (87.5%)
      carat18: (priceInEGP * 18) / 24, // 18 قيراط (75%)
      timestamp: new Date().toLocaleString('ar-EG')
    };
    
    return goldPrices;
  } catch (error) {
    console.error('خطأ في جلب أسعار الذهب:', error);
    return null;
  }
}

// جلب سعر الصرف (دولار إلى جنيه مصري)
async function getEGPRate() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    return data.rates.EGP || 30; // قيمة افتراضية إذا فشل الطلب
  } catch (error) {
    console.warn('خطأ في جلب سعر الصرف، استخدام قيمة افتراضية');
    return 30; // قيمة افتراضية
  }
}

// عرض الأسعار في الصفحة
async function displayGoldPrices() {
  const prices = await fetchGoldPrices();
  
  if (!prices) {
    document.getElementById('gold-prices').innerHTML = 
      '<p style="color: red;">عذراً، لم نتمكن من جلب الأسعار حالياً</p>';
    return;
  }
  
  const html = `
    <div class="gold-prices-container">
      <h2>أسعار الذهب اليوم</h2>
      <p class="timestamp">آخر تحديث: ${prices.timestamp}</p>
      
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
      
      <button onclick="displayGoldPrices()" class="refresh-btn">تحديث</button>
    </div>
  `;
  
  document.getElementById('gold-prices').innerHTML = html;
}

// تحديث الأسعار كل ساعة تلقائياً
setInterval(displayGoldPrices, 3600000); // كل ساعة

// عرض الأسعار عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', displayGoldPrices);