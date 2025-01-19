document.addEventListener('DOMContentLoaded', async () => {
    const dateEl = document.getElementById('date');
    const tableBody = document.querySelector('#student-table tbody');
    const sendSmsBtn = document.getElementById('send-sms');

    const today = new Date().toLocaleDateString();
    dateEl.textContent = `Today's Date: ${today}`;

    
    const fetchStudents = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/students');
            console.log('API Response Status:', res.status);

            if (!res.ok) {
                throw new Error(`Failed to fetch students: ${res.statusText}`);
            }

            const students = await res.json();
            console.log('Fetched Students:', students);

            if (!tableBody) {
                throw new Error('Table body element not found. Ensure the selector is correct and the DOM is loaded.');
            }

           
            tableBody.innerHTML = '';

            
            students.forEach((student) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.rollNumber}</td>
                    <td>
                        <select class="form-select" data-id="${student._id}">
                            <option value="Present" ${student.status === 'Present' ? 'selected' : ''}>Present</option>
                            <option value="Absent" ${student.status === 'Absent' ? 'selected' : ''}>Absent</option>
                            <option value="Late" ${student.status === 'Late' ? 'selected' : ''}>Late</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            
            attachStatusUpdateHandlers();
            updateSmsButtonState();
        } catch (error) {
            console.error('Error fetching students:', error);
            alert('Failed to load students. Please check the server and try again.');
        }
    };

    
    const updateSmsButtonState = () => {
        const statusSelects = document.querySelectorAll('select[data-id]');
        let hasAbsentees = false;


        statusSelects.forEach((select) => {
            if (select.value === 'Absent') {
                hasAbsentees = true;
            }
        });

        
        sendSmsBtn.disabled = !hasAbsentees;
    };

    const attachStatusUpdateHandlers = () => {
        const statusSelects = document.querySelectorAll('select[data-id]');
        statusSelects.forEach((select) => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const status = e.target.value;

                try {
                    const res = await fetch(`http://localhost:5000/api/attendance/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status }),
                    });

                    if (res.ok) {
                        console.log(`Updated status for ID ${id} to ${status}`);
                        updateSmsButtonState(); 
                    } else {
                        console.error(`Failed to update status for ID ${id}: ${res.statusText}`);
                        alert('Failed to update status. Please try again.');
                    }
                } catch (error) {
                    console.error(`Error updating status for ID ${id}:`, error);
                    alert('An error occurred while updating the status.');
                }
            });
        });
    };

    const sendSmsToAbsentees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/send-sms', { method: 'POST' });

            if (!res.ok) {
                throw new Error(`Failed to send SMS: ${res.statusText}`);
            }

            const data = await res.json();
            alert(data.message || 'SMS sent successfully!');
        } catch (error) {
            console.error('Error sending SMS:', error);
            alert('Failed to send SMS. Please try again.');
        }
    };

    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'block'; 
    fetchStudents().finally(() => spinner.style.display = 'none');

    sendSmsBtn.addEventListener('click', sendSmsToAbsentees);
});
