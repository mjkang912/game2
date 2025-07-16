-class BadukGame {
-    constructor() {
-        this.board = Array(19).fill(null).map(() => Array(19).fill(0));
-        this.currentPlayer = 1; // 1: 흑돌, 2: 백돌
-        this.blackCaptures = 0;
-        this.whiteCaptures = 0;
-        this.consecutivePasses = 0;
-        this.gameEnded = false;
-        this.canvas = document.getElementById('board');
-        this.ctx = this.canvas.getContext('2d');
-        
-        this.cellSize = 30;
-        this.boardOffset = 30;
-        
-        this.init();
-    }
-    
-    init() {
-        this.drawBoard();
-        this.setupEventListeners();
-        this.updateUI();
-    }
-    
-    setupEventListeners() {
-        this.canvas.addEventListener('click', (e) => this.handleClick(e));
-        document.getElementById('pass-btn').addEventListener('click', () => this.pass());
-        document.getElementById('resign-btn').addEventListener('click', () => this.resign());
-        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
-    }
-    
-    drawBoard() {
-        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
-        
-        // 바둑판 배경
-        this.ctx.fillStyle = '#deb887';
-        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
-        
-        // 격자 그리기
-        this.ctx.strokeStyle = '#000';
-        this.ctx.lineWidth = 1;
-        
-        for (let i = 0; i < 19; i++) {
-            // 세로선
-            this.ctx.beginPath();
-            this.ctx.moveTo(this.boardOffset + i * this.cellSize, this.boardOffset);
-            this.ctx.lineTo(this.boardOffset + i * this.cellSize, this.boardOffset + 18 * this.cellSize);
-            this.ctx.stroke();
-            
-            // 가로선
-            this.ctx.beginPath();
-            this.ctx.moveTo(this.boardOffset, this.boardOffset + i * this.cellSize);
-            this.ctx.lineTo(this.boardOffset + 18 * this.cellSize, this.boardOffset + i * this.cellSize);
-            this.ctx.stroke();
-        }
-        
-        // 화점 그리기
-        const starPoints = [
-            [3, 3], [3, 9], [3, 15],
-            [9, 3], [9, 9], [9, 15],
-            [15, 3], [15, 9], [15, 15]
-        ];
-        
-        this.ctx.fillStyle = '#000';
-        starPoints.forEach(([x, y]) => {
-            this.ctx.beginPath();
-            this.ctx.arc(
-                this.boardOffset + x * this.cellSize,
-                this.boardOffset + y * this.cellSize,
-                3, 0, 2 * Math.PI
-            );
-            this.ctx.fill();
-        });
-        
-        // 돌 그리기
-        this.drawStones();
-    }
-    
-    drawStones() {
-        for (let x = 0; x < 19; x++) {
-            for (let y = 0; y < 19; y++) {
-                if (this.board[x][y] !== 0) {
-                    this.drawStone(x, y, this.board[x][y]);
-                }
-            }
-        }
-    }
-    
-    drawStone(x, y, player) {
-        const centerX = this.boardOffset + x * this.cellSize;
-        const centerY = this.boardOffset + y * this.cellSize;
-        const radius = this.cellSize * 0.4;
-        
-        this.ctx.beginPath();
-        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
-        
-        if (player === 1) { // 흑돌
-            this.ctx.fillStyle = '#000';
-            this.ctx.fill();
-            this.ctx.strokeStyle = '#333';
-        } else { // 백돌
-            this.ctx.fillStyle = '#fff';
-            this.ctx.fill();
-            this.ctx.strokeStyle = '#000';
-        }
-        
-        this.ctx.lineWidth = 2;
-        this.ctx.stroke();
-    }
-    
-    handleClick(e) {
-        if (this.gameEnded) return;
-        
-        const rect = this.canvas.getBoundingClientRect();
-        const x = e.clientX - rect.left;
-        const y = e.clientY - rect.top;
-        
-        const boardX = Math.round((x - this.boardOffset) / this.cellSize);
-        const boardY = Math.round((y - this.boardOffset) / this.cellSize);
-        
-        if (boardX >= 0 && boardX < 19 && boardY >= 0 && boardY < 19) {
-            this.makeMove(boardX, boardY);
-        }
-    }
-    
-    makeMove(x, y) {
-        if (this.board[x][y] !== 0) return false;
-        
-        // 임시로 돌을 놓아봄
-        this.board[x][y] = this.currentPlayer;
-        
-        // 상대방 돌 잡기 확인
-        const opponent = this.currentPlayer === 1 ? 2 : 1;
-        let capturedStones = 0;
-        
-        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
-        directions.forEach(([dx, dy]) => {
-            const nx = x + dx;
-            const ny = y + dy;
-            if (this.isValidPosition(nx, ny) && this.board[nx][ny] === opponent) {
-                if (this.getLiberties(nx, ny).length === 0) {
-                    capturedStones += this.captureGroup(nx, ny);
-                }
-            }
-        });
-        
-        // 자신의 돌이 자살수인지 확인
-        if (this.getLiberties(x, y).length === 0 && capturedStones === 0) {
-            this.board[x][y] = 0; // 돌을 다시 제거
-            return false;
-        }
-        
-        // 잡은 돌 수 업데이트
-        if (this.currentPlayer === 1) {
-            this.blackCaptures += capturedStones;
-        } else {
-            this.whiteCaptures += capturedStones;
-        }
-        
-        this.consecutivePasses = 0;
-        this.switchPlayer();
-        this.drawBoard();
-        this.updateUI();
-        
-        return true;
-    }
-    
-    getLiberties(x, y) {
-        const color = this.board[x][y];
-        if (color === 0) return [];
-        
-        const visited = new Set();
-        const liberties = new Set();
-        const stack = [[x, y]];
-        
-        while (stack.length > 0) {
-            const [cx, cy] = stack.pop();
-            const key = `${cx},${cy}`;
-            
-            if (visited.has(key)) continue;
-            visited.add(key);
-            
-            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
-            directions.forEach(([dx, dy]) => {
-                const nx = cx + dx;
-                const ny = cy + dy;
-                
-                if (!this.isValidPosition(nx, ny)) return;
-                
-                if (this.board[nx][ny] === 0) {
-                    liberties.add(`${nx},${ny}`);
-                } else if (this.board[nx][ny] === color) {
-                    stack.push([nx, ny]);
-                }
-            });
-        }
-        
-        return Array.from(liberties);
-    }
-    
-    captureGroup(x, y) {
-        const color = this.board[x][y];
-        const captured = [];
-        const stack = [[x, y]];
-        const visited = new Set();
-        
-        while (stack.length > 0) {
-            const [cx, cy] = stack.pop();
-            const key = `${cx},${cy}`;
-            
-            if (visited.has(key)) continue;
-            visited.add(key);
-            captured.push([cx, cy]);
-            
-            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
-            directions.forEach(([dx, dy]) => {
-                const nx = cx + dx;
-                const ny = cy + dy;
-                
-                if (this.isValidPosition(nx, ny) && this.board[nx][ny] === color) {
-                    stack.push([nx, ny]);
-                }
-            });
-        }
-        
-        captured.forEach(([cx, cy]) => {
-            this.board[cx][cy] = 0;
-        });
-        
-        return captured.length;
-    }
-    
-    isValidPosition(x, y) {
-        return x >= 0 && x < 19 && y >= 0 && y < 19;
-    }
-    
-    switchPlayer() {
-        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
-    }
-    
-    pass() {
-        if (this.gameEnded) return;
-        
-        this.consecutivePasses++;
-        if (this.consecutivePasses >= 2) {
-            this.endGame();
-            return;
-        }
-        
-        this.switchPlayer();
-        this.updateUI();
-    }
-    
-    resign() {
-        if (this.gameEnded) return;
-        
-        const winner = this.currentPlayer === 1 ? '백' : '흑';
-        this.showGameResult(`${winner}돌 승리`, '상대방이 기권했습니다.');
-        this.gameEnded = true;
-    }
-    
-    endGame() {
-        this.gameEnded = true;
-        const result = this.calculateScore();
-        
-        let winner = '무승부';
-        let details = `흑: ${result.black}점, 백: ${result.white}점`;
-        
-        if (result.black > result.white) {
-            winner = '흑돌 승리';
-        } else if (result.white > result.black) {
-            winner = '백돌 승리';
-        }
-        
-        this.showGameResult(winner, details);
-    }
-    
-    calculateScore() {
-        // 간단한 점수 계산 (잡은 돌 수 + 영역)
-        let blackScore = this.blackCaptures;
-        let whiteScore = this.whiteCaptures + 6.5; // 덤
-        
-        // 각 플레이어의 돌 수 계산
-        for (let x = 0; x < 19; x++) {
-            for (let y = 0; y < 19; y++) {
-                if (this.board[x][y] === 1) blackScore++;
-                else if (this.board[x][y] === 2) whiteScore++;
-            }
-        }
-        
-        return {
-            black: blackScore,
-            white: whiteScore
-        };
-    }
-    
-    updateUI() {
-        const currentPlayerElement = document.getElementById('current-player');
-        currentPlayerElement.textContent = this.currentPlayer === 1 ? '흑돌 차례' : '백돌 차례';
-        
-        document.getElementById('black-captures').textContent = this.blackCaptures;
-        document.getElementById('white-captures').textContent = this.whiteCaptures;
-    }
-    
-    showGameResult(title, details) {
-        document.getElementById('result-title').textContent = title;
-        document.getElementById('result-details').textContent = details;
-        document.getElementById('game-result').classList.remove('hidden');
-    }
-    
-    newGame() {
-        this.board = Array(19).fill(null).map(() => Array(19).fill(0));
-        this.currentPlayer = 1;
-        this.blackCaptures = 0;
-        this.whiteCaptures = 0;
-        this.consecutivePasses = 0;
-        this.gameEnded = false;
-        
-        document.getElementById('game-result').classList.add('hidden');
-        this.drawBoard();
-        this.updateUI();
-    }
-}
-
-// 게임 시작
-document.addEventListener('DOMContentLoaded', () => {
-    new BadukGame();
-});
+class BadukGame {
+    constructor() {
+        this.board = Array(19).fill(null).map(() => Array(19).fill(0));
+        this.currentPlayer = 1; // 1: 흑돌, 2: 백돌
+        this.blackCaptures = 0;
+        this.whiteCaptures = 0;
+        this.consecutivePasses = 0;
+        this.gameEnded = false;
+        this.canvas = document.getElementById('board');
+        this.ctx = this.canvas.getContext('2d');
+        
+        this.cellSize = 30;
+        this.boardOffset = 30;
+        
+        this.init();
+    }
+    
+    init() {
+        this.drawBoard();
+        this.setupEventListeners();
+        this.updateUI();
+    }
+    
+    setupEventListeners() {
+        // 클릭과 터치 이벤트 모두 처리 (아이패드 지원)
+        this.canvas.addEventListener('click', (e) => this.handleClick(e));
+        this.canvas.addEventListener('touchstart', (e) => {
+            e.preventDefault();
+            this.handleTouch(e);
+        });
+        this.canvas.addEventListener('touchend', (e) => e.preventDefault());
+        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
+        
+        document.getElementById('pass-btn').addEventListener('click', () => this.pass());
+        document.getElementById('pass-btn').addEventListener('touchstart', (e) => {
+            e.preventDefault();
+            this.pass();
+        });
+        
+        document.getElementById('resign-btn').addEventListener('click', () => this.resign());
+        document.getElementById('resign-btn').addEventListener('touchstart', (e) => {
+            e.preventDefault();
+            this.resign();
+        });
+        
+        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
+        document.getElementById('new-game-btn').addEventListener('touchstart', (e) => {
+            e.preventDefault();
+            this.newGame();
+        });
+    }
+    
+    drawBoard() {
+        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
+        
+        // 바둑판 배경
+        this.ctx.fillStyle = '#deb887';
+        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
+        
+        // 격자 그리기
+        this.ctx.strokeStyle = '#000';
+        this.ctx.lineWidth = 1;
+        
+        for (let i = 0; i < 19; i++) {
+            // 세로선
+            this.ctx.beginPath();
+            this.ctx.moveTo(this.boardOffset + i * this.cellSize, this.boardOffset);
+            this.ctx.lineTo(this.boardOffset + i * this.cellSize, this.boardOffset + 18 * this.cellSize);
+            this.ctx.stroke();
+            
+            // 가로선
+            this.ctx.beginPath();
+            this.ctx.moveTo(this.boardOffset, this.boardOffset + i * this.cellSize);
+            this.ctx.lineTo(this.boardOffset + 18 * this.cellSize, this.boardOffset + i * this.cellSize);
+            this.ctx.stroke();
+        }
+        
+        // 화점 그리기
+        const starPoints = [
+            [3, 3], [3, 9], [3, 15],
+            [9, 3], [9, 9], [9, 15],
+            [15, 3], [15, 9], [15, 15]
+        ];
+        
+        this.ctx.fillStyle = '#000';
+        starPoints.forEach(([x, y]) => {
+            this.ctx.beginPath();
+            this.ctx.arc(
+                this.boardOffset + x * this.cellSize,
+                this.boardOffset + y * this.cellSize,
+                3, 0, 2 * Math.PI
+            );
+            this.ctx.fill();
+        });
+        
+        // 돌 그리기
+        this.drawStones();
+    }
+    
+    drawStones() {
+        for (let x = 0; x < 19; x++) {
+            for (let y = 0; y < 19; y++) {
+                if (this.board[x][y] !== 0) {
+                    this.drawStone(x, y, this.board[x][y]);
+                }
+            }
+        }
+    }
+    
+    drawStone(x, y, player) {
+        const centerX = this.boardOffset + x * this.cellSize;
+        const centerY = this.boardOffset + y * this.cellSize;
+        const radius = this.cellSize * 0.4;
+        
+        this.ctx.beginPath();
+        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
+        
+        if (player === 1) { // 흑돌
+            this.ctx.fillStyle = '#000';
+            this.ctx.fill();
+            this.ctx.strokeStyle = '#333';
+        } else { // 백돌
+            this.ctx.fillStyle = '#fff';
+            this.ctx.fill();
+            this.ctx.strokeStyle = '#000';
+        }
+        
+        this.ctx.lineWidth = 2;
+        this.ctx.stroke();
+    }
+    
+    handleClick(e) {
+        if (this.gameEnded) return;
+        
+        const rect = this.canvas.getBoundingClientRect();
+        const x = e.clientX - rect.left;
+        const y = e.clientY - rect.top;
+        
+        const boardX = Math.round((x - this.boardOffset) / this.cellSize);
+        const boardY = Math.round((y - this.boardOffset) / this.cellSize);
+        
+        if (boardX >= 0 && boardX < 19 && boardY >= 0 && boardY < 19) {
+            this.makeMove(boardX, boardY);
+        }
+    }
+    
+    handleTouch(e) {
+        if (this.gameEnded) return;
+        
+        const rect = this.canvas.getBoundingClientRect();
+        const touch = e.touches[0];
+        const x = touch.clientX - rect.left;
+        const y = touch.clientY - rect.top;
+        
+        const boardX = Math.round((x - this.boardOffset) / this.cellSize);
+        const boardY = Math.round((y - this.boardOffset) / this.cellSize);
+        
+        if (boardX >= 0 && boardX < 19 && boardY >= 0 && boardY < 19) {
+            this.makeMove(boardX, boardY);
+        }
+    }
+    
+    makeMove(x, y) {
+        if (this.board[x][y] !== 0) return false;
+        
+        // 임시로 돌을 놓아봄
+        this.board[x][y] = this.currentPlayer;
+        
+        // 상대방 돌 잡기 확인
+        const opponent = this.currentPlayer === 1 ? 2 : 1;
+        let capturedStones = 0;
+        
+        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
+        directions.forEach(([dx, dy]) => {
+            const nx = x + dx;
+            const ny = y + dy;
+            if (this.isValidPosition(nx, ny) && this.board[nx][ny] === opponent) {
+                if (this.getLiberties(nx, ny).length === 0) {
+                    capturedStones += this.captureGroup(nx, ny);
+                }
+            }
+        });
+        
+        // 자신의 돌이 자살수인지 확인
+        if (this.getLiberties(x, y).length === 0 && capturedStones === 0) {
+            this.board[x][y] = 0; // 돌을 다시 제거
+            return false;
+        }
+        
+        // 잡은 돌 수 업데이트
+        if (this.currentPlayer === 1) {
+            this.blackCaptures += capturedStones;
+        } else {
+            this.whiteCaptures += capturedStones;
+        }
+        
+        this.consecutivePasses = 0;
+        this.switchPlayer();
+        this.drawBoard();
+        this.updateUI();
+        
+        return true;
+    }
+    
+    getLiberties(x, y) {
+        const color = this.board[x][y];
+        if (color === 0) return [];
+        
+        const visited = new Set();
+        const liberties = new Set();
+        const stack = [[x, y]];
+        
+        while (stack.length > 0) {
+            const [cx, cy] = stack.pop();
+            const key = `${cx},${cy}`;
+            
+            if (visited.has(key)) continue;
+            visited.add(key);
+            
+            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
+            directions.forEach(([dx, dy]) => {
+                const nx = cx + dx;
+                const ny = cy + dy;
+                
+                if (!this.isValidPosition(nx, ny)) return;
+                
+                if (this.board[nx][ny] === 0) {
+                    liberties.add(`${nx},${ny}`);
+                } else if (this.board[nx][ny] === color) {
+                    stack.push([nx, ny]);
+                }
+            });
+        }
+        
+        return Array.from(liberties);
+    }
+    
+    captureGroup(x, y) {
+        const color = this.board[x][y];
+        const captured = [];
+        const stack = [[x, y]];
+        const visited = new Set();
+        
+        while (stack.length > 0) {
+            const [cx, cy] = stack.pop();
+            const key = `${cx},${cy}`;
+            
+            if (visited.has(key)) continue;
+            visited.add(key);
+            captured.push([cx, cy]);
+            
+            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
+            directions.forEach(([dx, dy]) => {
+                const nx = cx + dx;
+                const ny = cy + dy;
+                
+                if (this.isValidPosition(nx, ny) && this.board[nx][ny] === color) {
+                    stack.push([nx, ny]);
+                }
+            });
+        }
+        
+        captured.forEach(([cx, cy]) => {
+            this.board[cx][cy] = 0;
+        });
+        
+        return captured.length;
+    }
+    
+    isValidPosition(x, y) {
+        return x >= 0 && x < 19 && y >= 0 && y < 19;
+    }
+    
+    switchPlayer() {
+        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
+    }
+    
+    pass() {
+        if (this.gameEnded) return;
+        
+        this.consecutivePasses++;
+        if (this.consecutivePasses >= 2) {
+            this.endGame();
+            return;
+        }
+        
+        this.switchPlayer();
+        this.updateUI();
+    }
+    
+    resign() {
+        if (this.gameEnded) return;
+        
+        const winner = this.currentPlayer === 1 ? '백' : '흑';
+        this.showGameResult(`${winner}돌 승리`, '상대방이 기권했습니다.');
+        this.gameEnded = true;
+    }
+    
+    endGame() {
+        this.gameEnded = true;
+        const result = this.calculateScore();
+        
+        let winner = '무승부';
+        let details = `흑: ${result.black}점, 백: ${result.white}점`;
+        
+        if (result.black > result.white) {
+            winner = '흑돌 승리';
+        } else if (result.white > result.black) {
+            winner = '백돌 승리';
+        }
+        
+        this.showGameResult(winner, details);
+    }
+    
+    calculateScore() {
+        // 간단한 점수 계산 (잡은 돌 수 + 영역)
+        let blackScore = this.blackCaptures;
+        let whiteScore = this.whiteCaptures + 6.5; // 덤
+        
+        // 각 플레이어의 돌 수 계산
+        for (let x = 0; x < 19; x++) {
+            for (let y = 0; y < 19; y++) {
+                if (this.board[x][y] === 1) blackScore++;
+                else if (this.board[x][y] === 2) whiteScore++;
+            }
+        }
+        
+        return {
+            black: blackScore,
+            white: whiteScore
+        };
+    }
+    
+    updateUI() {
+        const currentPlayerElement = document.getElementById('current-player');
+        currentPlayerElement.textContent = this.currentPlayer === 1 ? '흑돌 차례' : '백돌 차례';
+        
+        document.getElementById('black-captures').textContent = this.blackCaptures;
+        document.getElementById('white-captures').textContent = this.whiteCaptures;
+    }
+    
+    showGameResult(title, details) {
+        document.getElementById('result-title').textContent = title;
+        document.getElementById('result-details').textContent = details;
+        document.getElementById('game-result').classList.remove('hidden');
+    }
+    
+    newGame() {
+        this.board = Array(19).fill(null).map(() => Array(19).fill(0));
+        this.currentPlayer = 1;
+        this.blackCaptures = 0;
+        this.whiteCaptures = 0;
+        this.consecutivePasses = 0;
+        this.gameEnded = false;
+        
+        document.getElementById('game-result').classList.add('hidden');
+        this.drawBoard();
+        this.updateUI();
+    }
+}
+
+// 게임 시작
+document.addEventListener('DOMContentLoaded', () => {
+    new BadukGame();
+});
