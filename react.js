//（component类），用来表示文本在渲染，更新，删除时应该做些什么事情
function ReactDOMTextComponent(text) {
  // 存下当前的字符串
  this._currentElement = '' + text;
  // 用来标识当前的component
  this._rootNodeID = null;
}

// component 渲染时生成的dom结构
ReactDOMTextComponent.prototype.mountComponent = function (rootID) {
  this._rootNodeID = rootID;
  return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>';
}

// component工厂  用来返回一个component实例 (类工厂)
function instantiateReactComponent(node) {
  //文本节点的情况
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactDOMTextComponent(node);
  }
  //浏览器默认节点的情况
  if (typeof node === 'object' || typeof node.type === 'string') {
    return new ReactDOMComponent(node);
  }
  //自定义的元素节点
  if(typeof node === 'object' && typeof node.type === 'function'){
    //注意这里，使用新的component,专门针对自定义元素
    return new ReactCompositeComponent(node);
  }
}

//（component类），用来表示文本在渲染，更新，删除时应该做些什么事情
function ReactDOMComponent(element) {
  // 存下当前的字符串
  this._currentElement = element;
  // 用来标识当前的component
  this._rootNodeID = null;
}

// component渲染时生成的dom结构
ReactDOMComponent.prototype.mountComponent = function (rootID) {
  // 赋值标识
  this._rootNodeID = rootID;
  var props = this._currentElement.props;
  var tagOpen = '<' + this._currentElement.type;
  var tagClose = '</' + this._currentElement.type + '>';
  //加上reactid标识
  tagOpen += ' data-reactid=' + this._rootNodeID;

  // 拼凑出属性
  for (var propKeys in props) {
    // 这里要做一下事件的监听，就是从属性props里面解析拿出on开头的事件属性的对应事件监听
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '');
      //针对当前的节点添加事件代理,以_rootNodeID为命名空间
      $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, props[propKey]);
    }
    // 对于children属性以及事件监听的属性不需要进行字符串拼接
    // 事件会代理到全局。这边不能拼到dom上不然会产生原生的事件监听
    if (props[propKey] && propKey != 'children' && !/^on[A-Za-z]/.test(propKey)) {
      tagOpen += ' ' + propKey + '=' + props[propKey];
    }
  }
  // 获取子节点渲染出的内容
  var content = '';
  var children = props.children || [];
  // 用于保存所有的子节点的component实例，以后会用到
  var childrenInstances = [];
  var that = this;
  $.each(children, function(key, child) {
    // 这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
    var childComponentInstance = instantiateReactComponent(child);
    childComponentInstance._mountIndex = key;

    childrenInstances.push(childComponentInstance);
    //子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
    var curRootId = that._rootNodeID + '.' + key;
    //得到子节点的渲染内容
    var childMarkup = childComponentInstance.mountComponent(curRootId);
    //拼接在一起
    content += ' ' + childMarkup;
  })
  //留给以后更新时用的这边先不用管
  this._renderedChildren = childrenInstances;
  //拼出整个html内容
  return tagOpen + '>' + content + tagClose;
}

// 自定义元素

//定义ReactClass类,所有自定义的超级父类
var ReactClass = function(){

}

//留给子类去继承覆盖
ReactClass.prototype.render = function(){

}

function ReactCompositeComponent(element){
  //存放元素element对象
  this._currentElement = element;
  //存放唯一标识
  this._rootNodeID = null;
  //存放对应的ReactClass的实例
  this._instance = null;
}

// 用于返回当前自定义元素渲染时应该返回的内容
ReactCompositeComponent.prototype.mountComponent = function(rootID){
  this._rootNodeID = rootID;
  //拿到当前元素对应的属性值
  var publicProps = this._currentElement.props;
  //拿到对应的ReactClass
  var ReactClass = this._currentElement.type;
  // Initialize the public class
  var inst = new ReactClass(publicProps);
  this._instance = inst;
  // 保留对当前component的引用，下面更新会用到
  inst._reactInternalInstance = this;
  if (inst.componentWillMount) {
    inst.componentWillMount();
    //这里在原始的reactjs其实还有一层处理，就是  componentWillMount调用setstate，不会触发rerender而是自动提前合并，这里为了保持简单，就略去了
  }
  // 调用ReactClass的实例的render方法,返回一个element或者一个文本节点
  var renderedElement = this._instance.render();
  //得到renderedElement对应的component类实例
  var renderedComponentInstance = instantiateReactComponent(renderedElement);
  // 存起来留作后用
  this._renderedComponent = renderedComponentInstance;

  // 拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
  var renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);
  //之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
  $(document).on('mountReady', function() {
    //调用inst.componentDidMount
    inst.componentDidMount && inst.componentDidMount();
  });

  return renderedMarkup;
}

React = {
  nextReactNodeIndex: 0,
  createClass: function(spec){
    //生成一个子类
    var Constructor = function (props) {
        this.props = props;
        this.state = this.getInitialState ? this.getInitialState() : null;
    }
    //原型继承，继承超级父类
    Constructor.prototype = new ReactClass();
    Constructor.prototype.constructor = Constructor;
    //混入spec到原型
    $.extend(Constructor.prototype,spec);
    return Constructor;
  },
  createElement:function(type,config,children){
    // ...
  },
  // 作为入口负责调用渲染
  render: function (element, container) {
    // 创建component实例
    var componentInstance = instantiateReactComponent(element);
    // 生成dom结构
    var markup = componentInstance.mountComponent(React.nextReactNodeIndex++);
    // 挂载dom
    $(container).html(markup);
    // 触发完成mount的事件
    $(document).trigger('mountReady');
  }
}