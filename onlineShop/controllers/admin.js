const Product = require('../models/product');
const deleteFile = require('../middleware/deleteFile')

exports.getAddProduct = (req, res, next) => {
  if(!req.session.isLoggedIn){
    res.redirect('/login')
  }
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    isAuthenticated: req.session.isLoggedIn,
    errMessage:req.flash('addproducterror')
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log(image)

  if(!image){
    console.log('Image is not set')
    req.flash('addproducterror','invalid image input format')
    res.redirect('/admin/add-product')
  }
  // if(!image){
  //   res.status(422).render('admin/edit-product',{
  //     pageTitle:'Add Product',
  //     path:'/admin/add-product',
  //     editing:false,
  //     product:{
  //       title:title,
  //       price:price,
  //       description:description
  //     },
  //     errMessage:'Invalid File Format'
  //   })
  // }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: image.path,
    userId: req.user
  });
  return product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        isAuthenticated: req.session.isLoggedIn,
        errMessage:''
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedImage = req.file;
  const updatedDesc = req.body.description;
 
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString() )
      {
        res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(updatedImage){
      deleteFile.deleteFile(product.imageUrl)
      product.imageUrl = updatedImage.path;
      }
      return product.save() 
      .then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => console.log(err));
};
const ITEMS_PER_PAGE = 2
exports.getProducts = (req, res, next) => {
  if(!req.session.isLoggedIn){
    res.redirect('/login')
  }
  const page = +req.query.page || 1 ;
  let TotalItems

  Product.find({userId:req.user._id})
  .countDocuments()
  .then(numOfProducts=>{
    TotalItems = numOfProducts
    return Product.find({userId:req.user._id})
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        isAuthenticated: req.session.isLoggedIn,
        currentPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<TotalItems,
        hasPreviousPage:page-1,
        nextPage:page+1,
        previousPage:page-1,
        lastPage:Math.ceil(TotalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
  .then(product=>{
    if(!product){
      return next(new Error('Product Not Found'))
    }
    deleteFile.deleteFile(product.imageUrl)
    return Product.findByIdAndRemove(prodId)
  }).then(() => {
      console.log('DESTROYED PRODUCT');
      res.json({message:"delete success"});
      //res.redirect('/admin/products');
    })
    .catch(err =>{
      console.log(err)
      res.json({message:"Deleting Product Failed"})
      });
};
