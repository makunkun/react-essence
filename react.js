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

// 用来判定两个element需不需要更新
// 这里的key是我们createElement的时候可以选择性的传入的。用来标识这个element，当发现key不同时，我们就可以直接重新渲染，不需要去更新了。
var _shouldUpdateReactComponent = function (prevElement, nextElement){
  if (prevElement != null && nextElement != null) {
    var prevType = typeof prevElement;
    var nextType = typeof nextElement;
    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number';
    } else {
      return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
    }
  }
  return false;
}

/**
 * @description 文本元素类
 */
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

ReactDOMTextComponent.prototype.receiveComponent = function(nextText) {
  var nextStringText = '' + nextText;
  // 跟以前保存的字符串比较
  if (nextStringText !== this._currentElement) {
      this._currentElement = nextStringText;
      //替换整个节点
      $('[data-reactid="' + this._rootNodeID + '"]').html(this._currentElement);
  }
}

/**
 * @description 基本元素类
 */
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

// 基本元素element的receiveComponent
// 比较复杂的浏览器基本元素的更新机制
// 拿新的子节点树跟以前老的子节点树对比，找出他们之间的差别。我们称之为diff
// 所有差别找出后，再一次性的去更新。我们称之为patch
ReactDOMComponent.prototype.receiveComponent = function(nextElement) {
  var lastProps = this._currentElement.props;
  var nextProps = nextElement.props;

  this._currentElement = nextElement;
  //需要单独的更新属性
  this._updateDOMProperties(lastProps, nextProps);
  //再更新子节点
  this._updateDOMChildren(nextElement.props.children);
}

ReactDOMComponent.prototype._updateDOMProperties = function (lastProps, nextProps) {
  var propKey;
  // 遍历，当一个老的属性不在新的属性集合里时，需要删除掉。
  for (propKey in lastProps) {
    // 新的属性里有，或者propKey是在原型上直接跳过。这样剩下的都是不在新属性集合里的。需要删除
    if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
      // 跳过这次循环
      continue;
    }
    // 以下为需要删除的属性及事件
    // 对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '');
      // 针对当前的节点取消事件代理
      $(document).undelegate()
    }
  }
}

/**
 * @description 自定义组件类
 */

//定义ReactClass类,所有自定义的超级父类
var ReactClass = function(){

}

// 留给子类去继承覆盖
ReactClass.prototype.render = function(){

}

// setState
ReactClass.prototype.setState = function(newState) {
  //还记得我们在ReactCompositeComponent里面mount的时候 做了赋值
  //所以这里可以拿到 对应的ReactCompositeComponent的实例_reactInternalInstance
  // 所有的componet类都应该实现receiveComponent用来处理自己的更新。
  this._reactInternalInstance.receiveComponent(null, newState);
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
    // 这里在原始的reactjs其实还有一层处理，就是  componentWillMount调用setstate，不会触发rerender而是自动提前合并，这里为了保持简单，就略去了
  }
  // 调用ReactClass的实例的render方法,返回一个element或者一个文本节点
  var renderedElement = this._instance.render();
  //得到renderedElement对应的component类实例
  var renderedComponentInstance = instantiateReactComponent(renderedElement);
  // 存起来留作后用
  this._renderedComponent = renderedComponentInstance;

  // 拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
  var renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);
  // 之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
  $(document).on('mountReady', function() {
    // 调用inst.componentDidMount
    inst.componentDidMount && inst.componentDidMount();
  });

  return renderedMarkup;
}

// 用于更新组件
// 首先会合并改动，生成最新的state,props
// 然后拿以前的render返回的element跟现在最新调用render生成的element进行对比（_shouldUpdateReactComponent）
// 看看需不需要更新，如果要更新就继续调用对应的component类对应的receiveComponent就好啦
// 其实就是直接当甩手掌柜，事情直接丢给手下去办了
// 当然还有种情况是，两次生成的element差别太大，就不是一个类型的，那好办直接重新生成一份新的代码重新渲染一次就o了。
// 本质上还是递归调用receiveComponent的过程。

// 这里注意两个函数：
// inst.shouldComponentUpdate是实例方法，当我们不希望某次setState后更新，我们就可以重写这个方法，返回false就好了。
// _shouldUpdateReactComponent是一个全局方法，这个是一种reactjs的优化机制。用来决定是直接全部替换，还是使用很细微的改动。当两次render出来的子节点key不同，直接全部重新渲染一遍，替换就好了。否则，我们就得来个递归的更新，保证最小化的更新机制，这样可以不会有太大的闪烁。

ReactCompositeComponent.prototype.receiveComponent = function(nextElement, newState) {
  // 如果接受了新的，就使用最新的element
  this._currentElement = nextElement || this._currentElement;

  var inst = this._instance;
  // 合并state
  var nextState = $.extend(inst.state, newState);
  var nextProps = this._currentElement.props;

  // 改写state
  inst.state = nextState;
  // 如果inst有shouldComponentUpdate并且返回false。说明组件本身判断不要更新，就直接返回。
  if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) {
    return;
  }
  // 生命周期管理，如果有componentWillUpdate，就调用，表示开始要更新了。
  if (inst.componentWillUpdate) {
    inst.componentWillUpdate(nextProps, nextState);
  }
  var prevComponentInstance = this._renderedComponent;
  var prevRenderedElement = prevComponentInstance._currentElement;
  // 重新执行render拿到对应的新element;
  var nextRenderedElement = this._instance.render();
  // 判断是需要更新还是直接就重新渲染
  // 注意这里的_shouldUpdateReactComponent跟上面的不同哦 这个是全局的方法
  if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
    // 如果需要更新，就继续调用子节点的receiveComponent的方法，传入新的element更新子节点。
    prevComponentInstance.receiveComponent(nextRenderedElement);
    // 调用componentDidUpdate表示更新完成了
    inst.componentDidUpdate && inst.componentDidUpdate();
  } else {
    // 如果发现完全是不同的两种element，那就干脆重新渲染了
    var thisID = this._rootNodeID;
    // 重新new一个对应的component，
    this._renderedComponent = instantiateReactComponent(nextRenderedElement);
    // 重新生成对应的元素内容
    var nextMarkup = _renderedComponent.mountComponent(thisID);
    // 替换整个节点
    $('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);
  }
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