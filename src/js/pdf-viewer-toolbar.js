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
