/*
 * Delegate Service
 * https://github.com/driftyco/ionic
 *
 * Copyright 2014 Drifty Co.
 * http://drifty.com/
 * Licensed under the MIT License.
 * https://raw.githubusercontent.com/driftyco/ionic/master/LICENSE
 */
function delegateService(methodNames) {
  return ['$log', function($log) {
    var delegate = this;

    var instances = this._instances = [];
    this._registerInstance = function(instance, handle) {
      instance.$$delegateHandle = handle;
      instances.push(instance);

      return function deregister() {
        var index = instances.indexOf(instance);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      };
    };

    this.$getByHandle = function(handle) {
      if (!handle) {
        return delegate;
      }
      return new InstanceForHandle(handle);
    };

    /*
     * Creates a new object that will have all the methodNames given,
     * and call them on the given the controller instance matching given
     * handle.
     * The reason we don't just let $getByHandle return the controller instance
     * itself is that the controller instance might not exist yet.
     *
     * We want people to be able to do
     * `var instance = $ionicScrollDelegate.$getByHandle('foo')` on controller
     * instantiation, but on controller instantiation a child directive
     * may not have been compiled yet!
     *
     * So this is our way of solving this problem: we create an object
     * that will only try to fetch the controller with given handle
     * once the methods are actually called.
     */
    function InstanceForHandle(handle) {
      this.handle = handle;
    }
    methodNames.forEach(function(methodName) {
      InstanceForHandle.prototype[methodName] = function() {
        var handle = this.handle;
        var args = arguments;
        var matchingInstancesFound = 0;
        var finalResult;
        var result;

        //This logic is repeated below; we could factor some of it out to a function
        //but don't because it lets this method be more performant (one loop versus 2)
        instances.forEach(function(instance) {
          if (instance.$$delegateHandle === handle) {
            matchingInstancesFound++;
            result = instance[methodName].apply(instance, args);
            //Only return the value from the first call
            if (matchingInstancesFound === 1) {
              finalResult = result;
            }
          }
        });

        if (!matchingInstancesFound) {
          return $log.warn(
            'Delegate for handle "'+this.handle+'" could not find a ' +
            'corresponding element with delegate-handle="'+this.handle+'"! ' +
            methodName + '() was not called!\n' +
            'Possible cause: If you are calling ' + methodName + '() immediately, and ' +
            'your element with delegate-handle="' + this.handle + '" is a child of your ' +
            'controller, then your element may not be compiled yet. Put a $timeout ' +
            'around your call to ' + methodName + '() and try again.'
          );
        }

        return finalResult;
      };
      delegate[methodName] = function() {
        var args = arguments;
        var finalResult;
        var result;

        //This logic is repeated above
        instances.forEach(function(instance, index) {
          result = instance[methodName].apply(instance, args);
          //Only return the value from the first call
          if (index === 0) {
            finalResult = result;
          }
        });

        return finalResult;
      };

      function callMethod(instancesToUse, methodName, args) {
        var finalResult;
        var result;
        instancesToUse.forEach(function(instance, index) {
          result = instance[methodName].apply(instance, args);
          //Make it so the first result is the one returned
          if (index === 0) {
            finalResult = result;
          }
        });
        return finalResult;
      }
    });
  }];
}
angular.module('pdf', [])
  .service('pdfDelegate', delegateService([
    'prev',
    'next',
    'zoomIn',
    'zoomOut',
    'rotate',
    'getPageCount',
    'getCurrentPage',
    'goToPage',
    'load'
  ]));
angular.module('pdf')
  .controller('PdfCtrl', [
    '$scope',
    '$element',
    '$attrs',
    'pdfDelegate',
    '$log',
  function($scope, $element, $attrs, pdfDelegate, $log) {

    // Register the instance!
    var deregisterInstance = pdfDelegate._registerInstance(this, $attrs.delegateHandle);
    // De-Register on destory!
    $scope.$on('$destroy', deregisterInstance);

    var self = this;

    var url = $scope.$eval($attrs.url);
    var width = $attrs.width ? $attrs.width : undefined;
    var headers = $scope.$eval($attrs.headers);
    var pdfDoc;
    $scope.pageCount = 0;
    var currentPage = 1;
    var angle = 0;
    var scale = $attrs.scale ? $attrs.scale : 1;
    var canvas = $element.find('canvas')[0];
    var ctx = canvas.getContext('2d');

    var renderPage = function(num) {
      if (!angular.isNumber(num))
        num = parseInt(num);
      pdfDoc
        .getPage(num)
        .then(function(page) {
          var viewport = undefined;
          if(width != undefined){
            viewport = page.getViewport(width/page.getViewport(scale).width);
            canvas.height = viewport.height;
            canvas.width = width;
          }else{
            viewport = page.getViewport(scale);
            canvas.height = viewport.height;
            canvas.width = viewport.width;
          }

          var renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };

          page.render(renderContext);
        });
    };

    var transform = function() {
      canvas.style.webkitTransform = 'rotate('+ angle + 'deg)';
      canvas.style.MozTransform = 'rotate('+ angle + 'deg)';
      canvas.style.msTransform = 'rotate('+ angle + 'deg)';
      canvas.style.OTransform = 'rotate('+ angle + 'deg)';
      canvas.style.transform = 'rotate('+ angle + 'deg)';
    };

    self.prev = function() {
      if (currentPage <= 1)
        return;
      currentPage = parseInt(currentPage, 10) - 1;
      renderPage(currentPage);
    };

    self.next = function() {
      if (currentPage >= pdfDoc.numPages)
        return;
      currentPage = parseInt(currentPage, 10) + 1;
      renderPage(currentPage);
    };

    self.zoomIn = function() {
      scale = parseFloat(scale) + 0.2;
      renderPage(currentPage);
      return scale;
    };

    self.zoomOut = function() {
      scale = parseFloat(scale) - 0.2;
      renderPage(currentPage);
      return scale;
    };

    self.rotate = function() {
      if (angle === 0) {
        angle = 90;
      } else if (angle === 90) {
        angle = 180;
      } else if (angle === 180) {
        angle = 270;
      } else {
        angle = 0
      }
      transform();
    };

    self.getPageCount = function() {
      return $scope.pageCount;
    };

    self.getCurrentPage = function () {
      return currentPage;
    };

    self.goToPage = function(newVal) {
      if (pdfDoc !== null) {
        currentPage = newVal;
        renderPage(newVal);
      }
    };

    self.load = function(_url) {
      if (_url) {
        url = _url;
      }

      var docInitParams = {};

      if (headers) {
        docInitParams.url = url;
        docInitParams.httpHeaders = headers;
      } else {
        docInitParams.url = url;
      }

      PDFJS
        .getDocument(docInitParams)
        .then(function (_pdfDoc) {

          pdfDoc = _pdfDoc;
          renderPage(1);
          $scope.$apply(function() {
            $scope.pageCount = _pdfDoc.numPages;
          });

        }, $log.error);
    };

    self.load();
}]);

angular.module('pdf')
  .directive('pdfViewerToolbar', [
    'pdfDelegate',
  function(pdfDelegate) {
    return {
      restrict: 'E',
      template:
        '<div class="col-xs-12 col-md-6 col-md-offset-3">'+
        ' <div class="row">'+
        '   <button class="btn btn-info col-xs-3" ng-click="prev()" ng-disable="disablePrev()">Previous</button>'+
        '   <span class="col-xs-6">'+
        '     <div class="row">'+
        '       <p class="col-xs-12 col-md-8 col-md-offset-2 text-center ng-binding">Page {{currentPage}} of {{pageCount}}</p>'+
        '     </div>'+
        '   </span>'+
        '   <button class="btn btn-primary col-xs-3" ng-click="next()" ng-disable="disableNext()">Next</button>'+
        ' </div>'+
        '</div>',
      scope: { pageCount: '=' },
      link: function(scope, element, attrs) {
        var id = attrs.delegateHandle;
        scope.currentPage = 1;

        scope.prev = function() {
          pdfDelegate
            .$getByHandle(id)
            .prev();
          updateCurrentPage();
        };
        scope.next = function() {
          pdfDelegate
            .$getByHandle(id)
            .next();
          updateCurrentPage();
        };
        scope.zoomIn = function() {
          pdfDelegate
            .$getByHandle(id)
            .zoomIn();
        };
        scope.zoomOut = function() {
          pdfDelegate
            .$getByHandle(id)
            .zoomOut();
        };
        scope.rotate = function() {
          pdfDelegate
            .$getByHandle(id)
            .rotate();
        };
        scope.goToPage = function() {
          pdfDelegate
            .$getByHandle(id)
            .goToPage(scope.currentPage);
        };

        var updateCurrentPage = function() {
          scope.currentPage = pdfDelegate
                                .$getByHandle(id)
                                .getCurrentPage();
        };
      }
    };
}]);

angular.module('pdf')
  .directive('pdfViewer', [
    '$window',
    '$log',
    'pdfDelegate',
  function($window, $log, pdfDelegate) {
    return {
      restrict: 'E',
      template: '<pdf-viewer-toolbar ng-if="showToolbar && toolbarTop" delegate-handle="{{id}}" page-count="pageCount"></pdf-viewer-toolbar> <canvas></canvas> <pdf-viewer-toolbar ng-if="showToolbar && !toolbarTop" delegate-handle="{{id}}" page-count="pageCount"></pdf-viewer-toolbar>',
      scope: true,
      controller: 'PdfCtrl',
      link: function(scope, element, attrs) {
        scope.id = attrs.delegateHandle;
        scope.showToolbar = scope.$eval(attrs.showToolbar) || false;
      }
    };
}]);
