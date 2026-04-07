import React from 'react';

const EventAnnouncements = () => {
  const events = [
    { id: 1, title: 'Sunroom Sketch Night', date: '2024-07-15', description: 'A relaxed creative evening with room to unwind, draw, and connect at your own pace.' },
    { id: 2, title: 'Moonlight Story Circle', date: '2024-08-01', description: 'A welcoming reflection night for listening, sharing, and settling into community.' },
    { id: 3, title: 'Apollo Selene Open House', date: '2024-08-20', description: 'An easygoing introduction to the space, upcoming events, and the people who gather here.' },
  ];

  return (
    <div>
      <h1>Apollo Selene Events</h1>
      <ul>
        {events.map(event => (
          <li key={event.id}>
            <h2>{event.title}</h2>
            <p>Date: {event.date}</p>
            <p>{event.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventAnnouncements;