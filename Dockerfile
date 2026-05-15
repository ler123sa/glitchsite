FROM nginx:alpine

# копируем сайт
COPY . /usr/share/nginx/html

# чистим дефолтный конфиг
RUN rm -f /etc/nginx/conf.d/default.conf

# наш шаблон nginx (PORT подставится при старте)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# не оставляем шаблон в html-папке
RUN rm -f /usr/share/nginx/html/nginx.conf.template /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/.dockerignore

CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
