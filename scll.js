(function() {
  function Scll(option) {
    this.container = document.querySelector( option.container || 'body' );
    if ( ! this.container ) {
      throw new Error( 'container is not found.' );
    }

    this.panels = this.container.querySelectorAll( '[data-scro-panel]' );
    this.triggerDistance = option.triggerDistance || 100;
    this.scrollDuration = option.scrollDuration || 500;
    this.isMoving = false;
    this.wheelDeltaY = 0;

    document.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    // 即座に実行するとブラウザの自動スクロールが優先されてしまうため若干遅らせる
    setTimeout(function() {
      window.scrollTo(0,0);
    }, 10);
    this.currentPanel = 0;
  }

  Scll.prototype = {
    onWheel: function( event ) {
      event.preventDefault();

      this.updateWheelEvent( event );

      if ( this.isMoving
        || this.isInertiaWheel()                  // 慣性でのホイールなら true
        || Math.abs( this.wheelDeltaY ) < 10 ) {  // ホイール量が極小なら true
        return;
      }

      this.isMoving = true;

      if ( this.wheelDeltaY > 0 ) {
        this.movePrevPanel().then( this.onFinishMove.bind(this) );
      } else {
        this.moveNextPanel().then( this.onFinishMove.bind(this) );
      }
    },

    /**
     * ホイールイベント情報を更新
     * @param {WheelEvent} event 
     */
    updateWheelEvent: function( event ) {
      this.prevWheelDeltaY = this.wheelDeltaY;
      this.wheelDeltaY = event.deltaY;
    },

    /**
     * 慣性でのホイールかどうかを判定
     * @param {WheelEvent} event
     * @return {boolean} 慣性でのホイールの場合は true
     */
    isInertiaWheel: function() {
      var isInertial = false;
      if ( Math.abs( this.prevWheelDeltaY ) >= Math.abs( this.wheelDeltaY ) ) {
        isInertial = true;
      }

      return isInertial;
    },

    onFinishMove: function() {
      this.isMoving = false;
    },

    onTouchStart: function( event ) {
      this.touchStartEvent = event;
    },

    onTouchMove: function( event ) {
      event.preventDefault();

      if ( this.isMoving ||  ! this.touchStartEvent ) {
        // パネル遷移中は次の移動距離検知用にタッチ位置を常に追う
        this.touchStartEvent = event;
        return;
      }

      var startY = this.touchStartEvent.touches[0].clientY;
      var currentY = event.touches[0].clientY;
      var moveDistance = currentY - startY;

      if ( Math.abs( moveDistance ) < this.triggerDistance ) {
        return;
      }

      this.isMoving = true;

      if ( moveDistance > 0 ) {
        this.movePrevPanel().then( this.onFinishMove.bind(this) );
      } else {
        this.moveNextPanel().then( this.onFinishMove.bind(this) );
      }
    },

    onTouchEnd: function( event ) {
      event.preventDefault();
      this.touchStartEvent = null;
    },

    /**
     * 次のパネルへ遷移する
     * @return {Promise} - 遷移アニメーションが終了したら resolve される
     */
    moveNextPanel: function() {
      if ( this.isLastPanel() ) {
        return Promise.resolve();
      }

      var nextPanel = this.panels[ this.currentPanel + 1 ];
      var nextPanelY = nextPanel.offsetTop;

      this.currentPanel = this.currentPanel + 1;

      var self = this;
      return new Promise( function( resolve ) {
        var scroller = new Scroller(
          window.scrollY,
          nextPanelY - window.scrollY,
          self.scrollDuration
        );
        scroller.scroll().then( resolve );
      } );
    },

    /**
     * 前のパネルへ遷移する
     * @return {Promise} - 遷移アニメーションが終了したら resolve される
     */
    movePrevPanel: function() {
      if ( this.isFirstPanel() ) {
        return Promise.resolve();
      }

      var prevPanel = this.panels[ this.currentPanel - 1 ];
      var prevPanelY = prevPanel.offsetTop;

      this.currentPanel = this.currentPanel - 1;

      var self = this;
      return new Promise( function( resolve ) {
        var scroller = new Scroller(
          window.scrollY,
          prevPanelY - window.scrollY,
          self.scrollDuration
        );
        scroller.scroll().then( resolve );
      } );
    },

    isFirstPanel: function() {
      return this.currentPanel === 0;
    },

    isLastPanel: function() {
      return this.currentPanel === this.panels.length - 1;
    }
  }

  function Scroller(startY, distance, duration) {
    this.startY = startY;
    this.distance = distance;
    this.duration = duration;
  }

  Scroller.prototype = {
    scroll: function() {
      var self = this;
      return new Promise( function( resolve ) {
        requestAnimationFrame( function( time ) {
          self.startTime = time;
          self.loop( time, resolve );
        } )
      } );
    },

    loop: function( time, resolve ) {
      var elapsed = time - this.startTime;

      if ( elapsed > this.duration ) {
        window.scrollTo( 0, this.startY + this.distance );
        resolve();
        return;
      }

      var progressDistance = elapsed / this.duration * this.distance;
      window.scrollTo( 0, this.startY + progressDistance );
      var self = this;
      requestAnimationFrame( function( time ) {
        self.loop( time, resolve );
      } );
    }
  }

  window.Scll = Scll;
})();
