class ProjectManager {
    constructor() {
        this.projects = {};
        this.currentProject = null;
        this.loadProjects();
    }

    addProject(name) {
        if (!this.projects[name]) {
            this.projects[name] = 0;
            this.saveProjects();
        }
        this.updateProjectList();
    }

    selectProject(name) {
        this.currentProject = name;
    }

    addTimeToCurrentProject(minutes) {
        const today = new Date().toISOString().slice(0, 10);
        if (this.currentProject) {
            this.projects[this.currentProject] += minutes;
            this.saveProjects();
        }
    }

    saveProjects() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }

    loadProjects() {
        const stored = localStorage.getItem('projects');
        if (stored) {
            this.projects = JSON.parse(stored);
        }
    }

    updateProjectList() {
        const select = document.getElementById('projects');
        select.innerHTML = '';

        Object.keys(this.projects).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });

        if (Object.keys(this.projects).length > 0) {
            this.currentProject = select.value;
        }
    }
}

class PomodoroTimer {
    constructor(durationMinutes, onSessionComplete, onTickComplete) {
        this.duration = durationMinutes * 60;
        this.breakDuration = 5 * 60;
        this.remaining = this.duration;
        this.timerId = null;
        this.isBreak = false;
        this.onSessionComplete = onSessionComplete;
        this.onTickComplete = onTickComplete;
        this.updateDisplay();
        this.isRunning = false;
        this.lastPause = this.duration;
        this.alarmSound = new Audio('ring.mp3');
    }

    start() {
        if (!this.timerId&& !this.isRunning) {
            this.isRunning = true;
            this.timerId = setInterval(() => this.tick(), 1000);
        }
    }

    pause() {
        if (this.timerId&& this.isRunning) {
            this.lastPause = this.remaining;
            clearInterval(this.timerId);
            this.timerId = null;
            this.isRunning = false;
        }
    }

    reset() {
        this.pause();
        this.remaining = this.duration;
        this.updateDisplay();
    }

    tick() {
        if (this.remaining > 0) {
            this.remaining--;
            this.updateDisplay();
            this.onTickComplete();
        } else {
            this.pause();
            this.alarmSound.play();
            this.onSessionComplete();
            this.handleSessionComplete();
            this.reset();
        }
    }

     handleSessionComplete() {
        if (!this.isBreak) {
            // Pomodoro vorbei => Zeige Pause-Fenster
            this.showModal("Zeit für eine Pause", () => {
                this.resetToBreak();
                this.start();
            });
        } else {
            // Pause vorbei => Zeige "weiterarbeiten"-Fenster
            this.showModal("Pause vorbei", () => {
                this.resetToWork();
                this.start();
            });
        }
        //this.onSessionComplete(); // optional (z. B. Statistik)
        this.focusTab();
    }

    showModal(message, callback) {
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.background = "white";
        modal.style.padding = "30px";
        modal.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
        modal.style.zIndex = 1000;

        const text = document.createElement("p");
        text.textContent = message;

        const btn = document.createElement("button");
        btn.textContent = "OK";
        btn.onclick = () => {
            document.body.removeChild(modal);
            callback();
        };

        modal.appendChild(text);
        modal.appendChild(btn);
        document.body.appendChild(modal);
    }

    updateDisplay() {
        const minutes = Math.floor(this.remaining / 60).toString().padStart(2, '0');
        const seconds = (this.remaining % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }

    resetToWork() {
        this.isBreak = false;
        this.remaining = this.duration;
        this.updateDisplay();
    }

    resetToBreak() {
        this.isBreak = true;
        this.remaining = this.breakDuration;
        this.updateDisplay();
    }

    focusTab() {
        if (document.hidden) {
            window.focus();
        }
    }    
}

class ChartManager {
    constructor(projectManager) {
        this.projectManager = projectManager;
        this.colorPalette = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(96, 181, 116, 0.7)'
        ];

        const ctx = document.getElementById('timeChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Stunden gearbeitet',
                    data: [],
                    backgroundColor: [],
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Stunden'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Chart.js eigene Legende ausblenden
                    }
                }
            }
        });
    }

    update() {
        const labels = Object.keys(this.projectManager.projects);
        const minutes = Object.values(this.projectManager.projects);
        const hours = minutes.map(m => (m / 60).toFixed(5));

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = hours;

        // Feste Farben verwenden:
        this.chart.data.datasets[0].backgroundColor = labels.map((_, index) => {
            return this.colorPalette[index % this.colorPalette.length];
        });

        this.chart.update();

        // Eigene Legende erzeugen:
        this.updateLegend(labels);
    }

    updateLegend(labels) {
        let legendContainer = document.getElementById('custom-legend');
        if (!legendContainer) {
            legendContainer = document.createElement('div');
            legendContainer.id = 'custom-legend';
            document.body.appendChild(legendContainer);
        }

        legendContainer.innerHTML = ''; // Clear old legend

        labels.forEach((label, index) => {
            const color = this.colorPalette[index % this.colorPalette.length];
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.marginBottom = '5px';

            const colorBox = document.createElement('div');
            colorBox.style.width = '20px';
            colorBox.style.height = '20px';
            colorBox.style.backgroundColor = color;
            colorBox.style.marginRight = '10px';
            colorBox.style.borderRadius = '3px';

            const labelText = document.createElement('span');
            labelText.textContent = label;

            item.appendChild(colorBox);
            item.appendChild(labelText);
            legendContainer.appendChild(item);
        });
    }
}


// Hauptlogik
const projectManager = new ProjectManager();
const chartManager = new ChartManager(projectManager);

const pomodoroTimer = new PomodoroTimer(25, () => {
    chartManager.update();
}, () => { if (!pomodoroTimer.isBreak) {
        projectManager.addTimeToCurrentProject(1/60); chartManager.update();}
});

document.getElementById('startBtn').addEventListener('click', () => pomodoroTimer.start());
document.getElementById('pauseBtn').addEventListener('click', () => {
   // if (pomodoroTimer.isRunning) {
    //const minutesWorked =(pomodoroTimer.lastPause - pomodoroTimer.remaining) / 60;
    //if (minutesWorked > 0) {
     //   projectManager.addTimeToCurrentProject(minutesWorked);
      //  chartManager.update();
    //}
    pomodoroTimer.pause();
    //pomodoroTimer.reset(); // Wichtig! Setzt Timer wieder auf 25:00
//}
});

//document.getElementById('pauseBtn').addEventListener('click', () => pomodoroTimer.pause());
document.getElementById('resetBtn').addEventListener('click', () => pomodoroTimer.reset());

document.getElementById('projects').addEventListener('change', (e) => {
    projectManager.selectProject(e.target.value);
});

document.getElementById('addProjectBtn').addEventListener('click', () => {
    const name = prompt('Projektname eingeben:');
    if (name) {
        projectManager.addProject(name);
        chartManager.update();
    }
});

// Init
projectManager.updateProjectList();
chartManager.update();
