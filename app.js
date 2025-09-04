const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('cart')||'[]'),
  search: ''
};

function formatINR(amount){
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount);
}

async function loadProducts(){
  const res = await fetch('./products.json');
  state.products = await res.json();
}

function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }

function addToCart(id, variant={color:null, size:null}, qty=1){
  const item = state.cart.find(c => c.id===id && c.variant.color===variant.color && c.variant.size===variant.size);
  if(item){ item.qty += qty; }
  else { state.cart.push({id, qty, variant}); }
  saveCart();
  renderCart();
}

function removeFromCart(index){
  state.cart.splice(index,1); saveCart(); renderCart();
}

function setQty(index, qty){
  state.cart[index].qty = Math.max(1, qty); saveCart(); renderCart();
}

function subtotal(){
  return state.cart.reduce((sum, item)=>{
    const p = state.products.find(p=>p.id===item.id);
    return sum + (p?.price||0) * item.qty;
  },0);
}

function mount(el, html){ el.innerHTML = html; }

function router(){
  const hash = location.hash.slice(1);
  if(hash.startsWith('product/')){
    const id = decodeURIComponent(hash.split('/')[1]);
    viewProduct(id);
  } else if(hash.startsWith('checkout')){
    viewCheckout();
  } else {
    viewHome();
  }
  renderCart();
}

function starRating(r){
  const full = '★'.repeat(Math.round(r));
  const empty = '☆'.repeat(5-Math.round(r));
  return `<span class="rating" aria-label="Rating ${r}">${full}${empty}</span>`;
}

function productCard(p){
  return `
  <article class="card">
    <a href="#product/${p.id}" aria-label="${p.name}">
      <img src="./assets/${p.images[0]}" alt="${p.name}" class="card__img" loading="lazy">
    </a>
    <div class="card__body">
      <div class="badges">
        <span class="badge">${p.category}</span>
        <span class="badge">${p.colors.length} colors</span>
      </div>
      <h3 class="card__title"><a href="#product/${p.id}">${p.name}</a></h3>
      <div>${starRating(p.rating)} <span aria-hidden="true">(${p.reviews})</span></div>
      <div class="price">
        <span class="price__now">${formatINR(p.price)}</span>
        <span class="price__was">${formatINR(p.compare_at)}</span>
      </div>
      <button class="btn btn--primary" onclick="addToCart('${p.id}', {color: '${p.colors[0]}', size: '${p.sizes[0]}'}, 1)">Add to Cart</button>
    </div>
  </article>`;
}

function viewHome(){
  const root = document.getElementById('view');
  const search = state.search.toLowerCase();
  const filtered = state.products.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));
  mount(root, `
    <section class="hero">
      <div class="hero__bg"></div>
      <div class="container hero__content">
        <h1 class="hero__title">Elevate your everyday style.</h1>
        <p class="hero__subtitle">Clothify Pro brings premium fabrics, modern cuts, and planet-friendly materials to your wardrobe.</p>
        <div class="hero__cta">
          <a href="#collections" class="btn btn--primary">Shop New Arrivals</a>
          <a href="#collections" class="btn btn--ghost">View Collections</a>
        </div>
        <div class="badges">
          <span class="badge">Free shipping over ₹999</span>
          <span class="badge">Easy 14-day returns</span>
          <span class="badge">Made in India</span>
        </div>
      </div>
    </section>
    <section id="collections" class="section container">
      <h2 style="margin:0 0 10px 0">Featured Products</h2>
      <div class="grid grid--products">
        ${filtered.map(productCard).join('')}
      </div>
    </section>
  `);
}

function viewProduct(id){
  const root = document.getElementById('view');
  const p = state.products.find(x=>x.id===id);
  if(!p){ mount(root, '<div class="container"><p>Product not found.</p></div>'); return; }
  const firstColor = p.colors[0], firstSize = p.sizes[0];
  mount(root, `
    <section class="section container product">
      <div class="product__gallery">
        <img src="./assets/${p.images[0]}" alt="${p.name}" class="product__img">
      </div>
      <div class="product__meta">
        <h1 style="margin:0">${p.name}</h1>
        <div>${starRating(p.rating)} <span class="kbd">(${p.reviews} reviews)</span></div>
        <div class="price">
          <span class="price__now">${formatINR(p.price)}</span>
          <span class="price__was">${formatINR(p.compare_at)}</span>
        </div>
        <p style="color:var(--muted)">${p.description}</p>
        <div>
          <div class="kbd">Color</div>
          <div class="swatch-row" id="color-row">
            ${p.colors.map((c,i)=>`<button class="swatch ${i===0?'active':''}" data-color="${c}" onclick="selectSwatch(this, 'color')">${c}</button>`).join('')}
          </div>
        </div>
        <div>
          <div class="kbd">Size</div>
          <div class="swatch-row" id="size-row">
            ${p.sizes.map((s,i)=>`<button class="swatch ${i===0?'active':''}" data-size="${s}" onclick="selectSwatch(this, 'size')">${s}</button>`).join('')}
          </div>
        </div>
        <div class="kbd">Quantity</div>
        <div class="qty">
          <button onclick="changeDetailQty(-1)">-</button>
          <span id="detail-qty">1</span>
          <button onclick="changeDetailQty(1)">+</button>
        </div>
        <div class="hero__cta">
          <button class="btn btn--primary" onclick="addCurrentProduct('${p.id}')">Add to Cart</button>
          <a class="btn" href="#checkout">Buy Now</a>
        </div>
        <div class="badges">
          <span class="badge">Cash on Delivery</span>
          <span class="badge">Secure Payments</span>
          <span class="badge">Ships in 24h</span>
        </div>
      </div>
    </section>
  `);
  window.currentDetail = { id: p.id, color: firstColor, size: firstSize, qty: 1 };
}

function selectSwatch(el, type){
  const group = type==='color' ? document.getElementById('color-row') : document.getElementById('size-row');
  [...group.children].forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  if(type==='color') window.currentDetail.color = el.dataset.color;
  if(type==='size') window.currentDetail.size = el.dataset.size;
}

function changeDetailQty(delta){
  window.currentDetail.qty = Math.max(1, (window.currentDetail.qty||1)+delta);
  document.getElementById('detail-qty').textContent = window.currentDetail.qty;
}

function addCurrentProduct(id){
  addToCart(id, {color: window.currentDetail.color, size: window.currentDetail.size}, window.currentDetail.qty||1);
}

function cartItemTemplate(item, index){
  const p = state.products.find(x=>x.id===item.id);
  return `<div class="cart-item">
    <img src="./assets/${p.images[0]}" alt="${p.name}"/>
    <div>
      <div style="font-weight:700">${p.name}</div>
      <div class="kbd">${item.variant.color} • ${item.variant.size}</div>
      <div class="price">${formatINR(p.price)}</div>
      <div class="qty">
        <button onclick="setQty(${index}, ${item.qty-1})">-</button>
        <span>${item.qty}</span>
        <button onclick="setQty(${index}, ${item.qty+1})">+</button>
      </div>
    </div>
    <button class="icon-btn" title="Remove" onclick="removeFromCart(${index})">✕</button>
  </div>`;
}

function renderCart(){
  const list = document.getElementById('cart-list');
  if(!list) return;
  const html = state.cart.map(cartItemTemplate).join('');
  list.innerHTML = html || '<div style="color:var(--muted)">Your cart is empty.</div>';
  document.getElementById('cart-total').textContent = formatINR(subtotal());
  const badge = document.getElementById('cart-badge');
  if(badge){ badge.dataset.badge = state.cart.reduce((n,i)=>n+i.qty,0); }
}

function viewCheckout(){
  const root = document.getElementById('view');
  mount(root, `
    <section class="section container layout">
      <div class="checkout">
        <h2>Checkout</h2>
        <form class="form" onsubmit="return payNow(event)">
          <div class="input"><label>Full Name</label><input required placeholder="Your name"></div>
          <div class="input"><label>Phone</label><input required type="tel" placeholder="10-digit mobile"></div>
          <div class="input"><label>Address</label><input required placeholder="House no, Street, Area"></div>
          <div class="input"><label>City</label><input required placeholder="City"></div>
          <div class="input"><label>Pincode</label><input required pattern="\d{6}" placeholder="6-digit"></div>
          <div class="input"><label>State</label>
            <select required>
              <option value="">Select state</option>
              <option>Tamil Nadu</option><option>Karnataka</option><option>Kerala</option><option>Telangana</option><option>Andhra Pradesh</option><option>Maharashtra</option>
            </select>
          </div>
          <div class="input"><label>Email (for receipt)</label><input type="email" placeholder="name@example.com"></div>
          <div>
            <div class="kbd" style="margin-bottom:6px">Payment Method</div>
            <div class="radio-row">
              <label class="radio"><input type="radio" name="pay" value="upi" required> UPI (GPay/PhonePe/Paytm)</label>
              <label class="radio"><input type="radio" name="pay" value="card"> Debit/Credit Card</label>
              <label class="radio"><input type="radio" name="pay" value="cod"> Cash on Delivery</label>
            </div>
          </div>
          <button class="btn btn--primary" type="submit">Pay Now</button>
        </form>
      </div>
      <aside class="cart">
        <div class="cart__header"><strong>Order Summary</strong><span class="kbd">Auto-updates</span></div>
        <div id="cart-list" class="cart__list"></div>
        <div class="cart__footer">
          <div class="cart__total"><span>Subtotal</span><span id="cart-total">₹0</span></div>
          <div class="kbd">Shipping: Free • Taxes included</div>
        </div>
      </aside>
    </section>
  `);
}

function payNow(e){
  e.preventDefault();
  if(state.cart.length===0){
    alert('Add items to cart before paying.'); return false;
  }
  const method = (new FormData(e.target)).get('pay');
  setTimeout(()=>{
    alert('Payment simulated via '+ (method||'selected method') + '. Order placed!');
    state.cart = []; saveCart(); location.hash = ''; router();
  }, 200);
  return false;
}

function attachSearch(){
  const input = document.getElementById('search');
  input.addEventListener('input', (e)=>{ state.search = e.target.value; viewHome(); });
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadProducts();
  attachSearch();
  router();
});