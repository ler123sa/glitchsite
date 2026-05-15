FROM nginx:alpine

# Полная замена дефолтного конфига (без шаблонов, без envsubst)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Сайт
COPY . /usr/share/nginx/html

# Чистим лишнее из html
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
 && echo "=== html files ===" && ls -la /usr/share/nginx/html/ \
 && echo "=== nginx config ===" && cat /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
