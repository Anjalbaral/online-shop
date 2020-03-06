const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs')
const path = require('path')
const pdfkit = require('pdfkit')
const ITEMS_PER_PAGE = 2
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
   let TotalItems
  Product.find().countDocuments()
    .then(numOfProducts=>{
    TotalItems = numOfProducts
    return Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      console.log(products);
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        isAuthenticated: req.session.isLoggedIn,
        currentPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<TotalItems,
        hasPreviousPage:page-1,
        nextPage:page+1,
        previousPage:page-1,
        lastPage:Math.ceil(TotalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  console.log(page)
  
  let TotalItems

  Product.find().countDocuments()
  .then(numOfProducts=>{
    TotalItems = numOfProducts
    return Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
  .then(products => {
    res.render('shop/index', {
      prods: products,
      pageTitle: 'Shop',
      path: '/',
      isAuthenticated: req.session.isLoggedIn,
      currentPage: page,
      totalProducts:TotalItems,
      hasNextPage:ITEMS_PER_PAGE*page<TotalItems,
      hasPreviousPage:page > 1,
      nextPage: page + 1,
      previousPage: page-1,
      lastPage: Math.ceil(TotalItems/ITEMS_PER_PAGE)
    });
  })
  .catch(err => {
    console.log(err);
  });
};

exports.getCart = (req, res, next) => {
  if(!req.session.isLoggedIn){
    res.redirect('/login')
  }
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  if(!req.session.isLoggedIn){
    res.redirect('/login')
  }
  
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice = (req,res,next) =>{
 if(!req.session.isLoggedIn){
   return next();
 }
  
  const orderId = req.params.orderID
  const invoiceName = 'invoices-'+orderId+'.pdf'
  const invoicePath = path.join('data','invoices',invoiceName)
 
  Order.findById(orderId)
  .then(order=>{
    if(!order){
     return next(new Error('No Order Found.'))
    }
    if(String(order.user.userId)!== String(req.session.user._id)){
      return next(new Error('unauthorized user'))
    }

    const pdfDoc = new pdfkit();
    pdfDoc.pipe(fs.createWriteStream(invoicePath))
    pdfDoc.pipe(res)

    let totalPrice = 0
    pdfDoc.text("Invoices")
    pdfDoc.text('-------------------------------')
    order.products.forEach(prod=>{
      totalPrice += prod.quantity * prod.product.price
      pdfDoc.text(prod.product.title+'-'+prod.quantity+'X'+' $ '+prod.product.price)
    })
    pdfDoc.text('Total Price: $'+totalPrice)
    pdfDoc.end()

    // return fs.readFile(invoicePath,(err,data)=>{
    //   if(err){
    //     return next();
    //   }
    //   res.setHeader('Content-Type','application/pdf');
    //   res.send(data)
    // })
    //   const fileStream = fs.createReadStream(invoicePath);
     res.setHeader('Content-Type','application/pdf');
  //   res.setHeader('Content-Description','inline;filename="'+invoiceName+'"');
  //   fileStream.pipe(res)
   })
   .catch(err=>{console.log(err)})

}