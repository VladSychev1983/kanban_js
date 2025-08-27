document.addEventListener("DOMContentLoaded", () => {
  const kanbanBoard = document.getElementById("kanban-board");

  // Состояние доски
  // Используем localStorage для сохранения состояния между сессиями
  let kanbanData = JSON.parse(localStorage.getItem("kanbanData")) || {
    todo: [],
    "in-progress": [],
    done: [],
  };

  // Сохранение состояния в localStorage
  function saveKanbanData() {
    localStorage.setItem("kanbanData", JSON.stringify(kanbanData));
  }

  // Генерация уникального ID для карточки
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Создание элемента карточки
  function createCardElement(card) {
    const cardElement = document.createElement("div");
    cardElement.classList.add("kanban-card");
    cardElement.setAttribute("draggable", "true");
    cardElement.dataset.cardId = card.id;
    cardElement.innerHTML = `
            <span>${card.text}</span>
            <button class="delete-card">
                   <i class="material-icons">&#x2715</i>
            </button>
        `;

    // Обработчик удаления карточки
    cardElement.querySelector(".delete-card").addEventListener("click", () => {
      const columnId = cardElement.closest(".kanban-column").dataset.columnId;
      deleteCard(columnId, card.id);
    });

    // Обработчики Drag and Drop для карточки
    cardElement.addEventListener("dragstart", handleDragStart);
    cardElement.addEventListener("dragend", handleDragEnd);
    return cardElement;
  }

  // Отрисовка колонки
  function renderColumn(columnId) {
    const columnElement = document.querySelector(
      `.kanban-column[data-column-id="${columnId}"] .kanban-cards`,
    );
    if (!columnElement) return;

    columnElement.innerHTML = ""; // Очищаем текущие карточки

    kanbanData[columnId].forEach((card) => {
      columnElement.appendChild(createCardElement(card));
    });
  }

  // Добавление новой карточки
  function addCard(columnId, text) {
    if (text.trim() === "") return;

    const newCard = {
      id: generateUniqueId(),
      text: text.trim(),
    };
    kanbanData[columnId].push(newCard);
    renderColumn(columnId);
    saveKanbanData();
  }

  // Удаление карточки
  function deleteCard(columnId, cardId) {
    kanbanData[columnId] = kanbanData[columnId].filter(
      (card) => card.id !== cardId,
    );
    renderColumn(columnId);
    saveKanbanData();
  }

  // Инициализация доски
  function initKanban() {
    const columnNames = {
      todo: "TODO",
      "in-progress": "IN PROGRESS",
      done: "DONE",
    };

    for (const columnId in columnNames) {
      const columnElement = document.createElement("div");
      columnElement.classList.add("kanban-column");
      columnElement.dataset.columnId = columnId;
      columnElement.innerHTML = `
                <h2>${columnNames[columnId]}</h2>
                <div class="kanban-cards">
                    <!-- Карточки будут здесь -->
                </div>
                <div class="add-card-container" data-container-id="${columnId}">
                    <textarea class="add-card-textarea" placeholder="Enter a title for this card.."></textarea>
                    <button class="add-card-button">Add card</button>
                </div>
                <div class="show-hide-textarea" data-button-id="${columnId}">+Add another card</div>
            `;
      kanbanBoard.appendChild(columnElement);

      // Отрисовка существующих карточек
      renderColumn(columnId);

      // Обработчики добавления карточки
      const addCardButton = columnElement.querySelector(".add-card-button");
      const addCardTextarea = columnElement.querySelector(".add-card-textarea");

      addCardButton.addEventListener("click", () => {
        addCard(columnId, addCardTextarea.value);
        addCardTextarea.value = ""; // Очистка textarea
      });

      // Добавление карточки по Enter
      addCardTextarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          // Shift+Enter для новой строки
          e.preventDefault();
          addCard(columnId, addCardTextarea.value);
          addCardTextarea.value = "";
        }
      });

      // Обработчики Drag and Drop для колонок (контейнеров карточек)
      const cardsContainer = columnElement.querySelector(".kanban-cards");
      cardsContainer.addEventListener("dragover", handleDragOver);
      cardsContainer.addEventListener("dragleave", handleDragLeave);
      cardsContainer.addEventListener("drop", handleDrop);
    }
    //показываем и скрываем карт контейнер
    for (const element of Object.keys(columnNames)) {
      const todoConteiner = document.querySelector(
        `[data-column-id=${element}]`,
      );
      const cardContainer = todoConteiner.querySelector(
        `[data-container-id=${element}]`,
      );
      const hideShowButton = todoConteiner.querySelector(
        `[data-button-id=${element}]`,
      );
      hideShowButton.addEventListener("click", () => {
        cardContainer.classList.toggle("enabled");
      });
      //при наведении на кнопку добавить карточку меняем курсор
      hideShowButton.addEventListener("mouseover", () => {
        hideShowButton.style.textDecoration = "underline";
        hideShowButton.style.cursor = "pointer";
      });
      hideShowButton.addEventListener("mouseout", () => {
        hideShowButton.style.textDecoration = "none";
        hideShowButton.style.cursor = "default";
      });
      hideShowButton.removeEventListener("click", () => {
        cardContainer.classList.toggle("enabled");
      });
    }
  }

  // --- Drag and Drop логика ---
  let draggedCard = null;
  let originalColumnId = null;

  function handleDragStart(e) {
    draggedCard = e.target;
    originalColumnId = draggedCard.closest(".kanban-column").dataset.columnId;
    e.dataTransfer.setData("text/plain", draggedCard.dataset.cardId); // Сохраняем ID карточки
    e.dataTransfer.effectAllowed = "move";

    // Добавляем класс для визуального эффекта
    setTimeout(() => {
      draggedCard.classList.add("dragging");
    }, 0); // Небольшая задержка, чтобы класс применился после того, как браузер сделает скриншот для перетаскивания
  }

  function handleDragEnd() {
    draggedCard.classList.remove("dragging");
    draggedCard = null;
    originalColumnId = null;

    // Очищаем все drag-over классы
    document
      .querySelectorAll(".kanban-cards.drag-over")
      .forEach((container) => {
        container.classList.remove("drag-over");
      });
    document.querySelectorAll(".placeholder-card").forEach((placeholder) => {
      placeholder.remove();
    });
  }

  function handleDragOver(e) {
    e.preventDefault(); // Разрешаем дроп
    e.dataTransfer.dropEffect = "move";

    const targetColumnCards = e.currentTarget;
    targetColumnCards.classList.add("drag-over"); // Подсветка колонки

    const afterElement = getDragAfterElement(targetColumnCards, e.clientY);
    const currentPlaceholder =
      targetColumnCards.querySelector(".placeholder-card");

    if (!currentPlaceholder) {
      const placeholder = document.createElement("div");
      placeholder.classList.add("placeholder-card");
      if (afterElement == null) {
        targetColumnCards.appendChild(placeholder);
      } else {
        targetColumnCards.insertBefore(placeholder, afterElement);
      }
    } else if (afterElement == null) {
      targetColumnCards.appendChild(currentPlaceholder);
    } else if (
      currentPlaceholder.nextElementSibling !== afterElement &&
      currentPlaceholder.previousElementSibling !== afterElement
    ) {
      targetColumnCards.insertBefore(currentPlaceholder, afterElement);
    }
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
    e.currentTarget
      .querySelectorAll(".placeholder-card")
      .forEach((placeholder) => {
        placeholder.remove();
      });
  }

  function handleDrop(e) {
    e.preventDefault();
    const targetColumnCards = e.currentTarget;
    targetColumnCards.classList.remove("drag-over");

    const cardId = e.dataTransfer.getData("text/plain");
    const targetColumnId =
      targetColumnCards.closest(".kanban-column").dataset.columnId;

    // Находим карточку в исходной колонке
    let cardToMove = null;
    kanbanData[originalColumnId] = kanbanData[originalColumnId].filter(
      (card) => {
        if (card.id === cardId) {
          cardToMove = card;
          return false; // Удаляем из исходной колонки
        }
        return true;
      },
    );

    if (cardToMove) {
      // Определяем, куда вставить карточку в новой колонке
      const afterElement = getDragAfterElement(targetColumnCards, e.clientY);
      const placeholder = targetColumnCards.querySelector(".placeholder-card");

      if (placeholder) {
        // Вставляем карточку на место плейсхолдера
        const index = Array.from(targetColumnCards.children).indexOf(
          placeholder,
        );
        if (index !== -1) {
          kanbanData[targetColumnId].splice(index, 0, cardToMove);
        } else {
          kanbanData[targetColumnId].push(cardToMove);
        }
        placeholder.remove();
      } else if (afterElement == null) {
        kanbanData[targetColumnId].push(cardToMove);
      } else {
        const index = Array.from(targetColumnCards.children).indexOf(
          afterElement,
        );
        kanbanData[targetColumnId].splice(index, 0, cardToMove);
      }
    }

    renderColumn(originalColumnId); // Перерисовываем исходную колонку
    renderColumn(targetColumnId); // Перерисовываем целевую колонку
    saveKanbanData();
  }

  // Вспомогательная функция для определения, куда вставить элемент (для сортировки внутри колонки)
  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".kanban-card:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }

  // Запускаем инициализацию доски
  initKanban();
});
